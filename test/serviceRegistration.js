var serviceBase = require('./utils/servicebase')
var assert = require('assert');
var dbService = require('../services/model');
var prepopulate = require('./utils/prepopulate');
var superagent = require('superagent');
var i18n = require('i18n');

var baseUrl = serviceBase.baseUrl;
var authenticateUser = serviceBase.authenticateUser;
var tokenHeader = serviceBase.tokenHeader;

describe('Service', function() {
  serviceBase.hooks();

  describe('registration', function () {
    it('should be able to register a new user if registration is allowed', function (done) {
      var userData = {username: "user01", password: "password"};
      process.env.ALLOW_REGISTRATION = true;
      superagent.post(baseUrl + "/register").send(userData).end(function(err, result){
        if(err) return done(err);
        try {
          assert.equal(result.status, 200);
          assert.deepEqual(result.body, {username : 'user01'});
          dbService.User.findAll().then(function(users){
            assert.equal(users.length, 1);
            assert.equal(users[0].username, 'user01');
            users[0].validatePassword('password', function(err, passwordValid){
              if(err) return done(err);
              try {
                assert.equal(passwordValid, true);
                done();
              } catch (err) { done(err) };
            })
          }).catch(done);
        } catch(err) {done(err);}
      });
    });
    it('should not be able to register a new user if registration is not allowed', function (done) {
      var userData = {username: "user01", password: "password"};
      process.env.ALLOW_REGISTRATION = false;
      superagent.post(baseUrl + "/register").send(userData).end(function(err, result){
        try {
          assert.ok(err);
          assert.equal(result.status, 500);
          assert.deepEqual(result.body, {exception : i18n.__('Registration is not allowed')});
          dbService.User.findAll().then(function(users){
            assert.equal(users.length, 0);
            done();
          }).catch(done)
        } catch(err) {done(err);}
      });
    });
    it('should not be able to register a new user if the username is already in use', function (done) {
      var userData = {username: "user01", password: "anotherpassword"};
      process.env.ALLOW_REGISTRATION = true;
      prepopulate().then(function(){
        superagent.post(baseUrl + "/register").send(userData).end(function(err, result){
          try {
            assert.ok(err);
            assert.equal(result.status, 500);
            assert.deepEqual(result.body, {exception : i18n.__('User already exists')});
            dbService.User.findAll().then(function(users){
              assert.equal(users.length, 2);
              assert.equal(users[0].username, 'user01');
              assert.equal(users[1].username, 'user02');
              users[0].validatePassword('mypassword', function(err, passwordValid){
                if(err) return done(err);
                try {
                  assert.equal(passwordValid, true);
                  users[1].validatePassword('mypassword2', function(err, passwordValid){
                    if(err) return done(err);
                    try {
                      assert.equal(passwordValid, true);
                      done();
                    } catch (err) { done(err) };
                  });
                } catch (err) { done(err) };
              });
            }).catch(done);
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should accept authentication of a valid user', function (done) {
      var userData = {username: "user01", password: "mypassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          if(err) return done(err);
          try {
            assert.equal(result.status, 200);
            assert.ok(token);
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
    it('should reject authentication of an invalid user', function (done) {
      var userData = {username: "user01", password: "badpassword"};
      prepopulate().then(function(){
        authenticateUser(userData, function(err, token, result){
          try {
            assert.ok(err);
            assert.equal(err.status, 500);
            assert.equal(err.response.body.error_description, i18n.__('Bad credentials'));
            assert.equal(!!token, false);
            done();
          } catch(err) {done(err);}
        });
      }).catch(done);
    });
  });
});