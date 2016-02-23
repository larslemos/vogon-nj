var express = require('express');
var dbService = require('../model/service');
var analyticsService = require('../services/analytics');
var passport = require('passport');
var multer = require('multer');
var currencies = require('country-data').currencies;
var i18n = require('i18n');
var router = express.Router();

/* Authentication */
router.use(passport.authenticate('bearer', { session: false }));

/* Uploads */
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

/* GET accounts. */
router.get('/accounts', function(req, res, next) {
  dbService.Account.findAll({where: {UserId: req.user.id} }).then(function(accounts){
    res.send(accounts);
  }).catch(next);
});

/* POST accounts. */
router.post('/accounts', function(req, res, next) {
  var reqAccounts = req.body;
  var reqAccountsIds = {};
  reqAccounts.forEach(function(account){
    return reqAccountsIds[account.id] = account;
  });
  dbService.sequelize.transaction(function(transaction){
    return dbService.Account.findAll({where: {UserId: req.user.id}, transaction: transaction}).then(function(dbAccounts){
      var existingAccountIds = {};
      dbAccounts.forEach(function(account){
        existingAccountIds[account.id] = account;
      });
      var newAccounts = reqAccounts.filter(function(account){
        return existingAccountIds[account.id] === undefined;
      }).map(function(account){
        delete account.id;
        return account;
      });
      var deletedAccounts = dbAccounts.filter(function(account){
        return reqAccountsIds[account.id] === undefined;
      });
      var updatedAccounts = reqAccounts.filter(function(account){
        return existingAccountIds[account.id] !== undefined;
      }).map(function(account){
        delete account.balance;
        return account;
      });
      return dbService.sequelize.Promise.all(
        deletedAccounts.map(function(account){
          return account.destroy({transaction: transaction});
        })
      ).then(function(){
        return dbService.sequelize.Promise.all(newAccounts.map(function(account){
          return dbService.Account.create(account, {transaction: transaction}).then(function(newAccount){
            return newAccount.setUser(req.user, {transaction: transaction});
          });
        }));
      }).then(function(){
        return dbService.sequelize.Promise.all(updatedAccounts.map(function(account){
          return existingAccountIds[account.id].update(account, {transaction: transaction});
        }));
      }).then(function(){
        return dbService.Account.findAll({where: {UserId: req.user.id}, transaction: transaction});
      }).then(function(accounts){
        res.send(accounts.map(function(account){
          return account.toJSON();
        }));
      });
    });
  }).catch(next);
});

/* GET transactions. */
router.get('/transactions', function(req, res, next) {
  var pageSize = 100;
  var page = req.query.page;
  var sortColumn = req.query.sortColumn;
  var sortDirection = req.query.sortDirection;
  var filterDescription = req.query.filterDescription;
  var filterDate = req.query.filterDate;
  var filterTags = req.query.filterTags;
  page = page !== undefined ? page : 0;
  var offset = page * pageSize;
  var sortOrder = [
    [sortColumn, sortDirection],
    ['id', sortDirection]
  ];
  var where = {UserId: req.user.id};
  if(filterDescription !== undefined && filterDescription.length > 0)
    where.description = {$like: filterDescription};
  if(filterDate !== undefined && filterDate.length > 0)
    where.date = filterDate;
  if(filterTags !== undefined && filterTags.length > 0)
    filterTags = filterTags.split(",");
  if(filterTags !== undefined && filterTags.length > 0)
    where.$or = filterTags.map(function(tag){return {tags: {$like: '%"' + tag + '"%'}}});
  dbService.FinanceTransaction.findAll({
    where: where,
    include: [dbService.FinanceTransactionComponent],
    order: sortOrder,
    offset: offset, limit: pageSize
  }).then(function(financeTransactions){
    res.send(financeTransactions.map(function(financeTransaction){
      delete financeTransaction.UserId;
      return financeTransaction;
    }));
  }).catch(next);
});

/* GET transaction. */
router.get('/transactions/transaction/:id', function(req, res, next) {
  dbService.FinanceTransaction.findOne({where: {id: req.params.id, UserId: req.user.id}, include: [dbService.FinanceTransactionComponent]}).then(function(financeTransaction){
    res.send(financeTransaction.toJSON());
  });
});

/* POST transactions. */
router.post('/transactions', function(req, res, next) {
  var reqFinanceTransaction = req.body;
  var reqFinanceTransactionComponents = reqFinanceTransaction.FinanceTransactionComponents !== undefined ? reqFinanceTransaction.FinanceTransactionComponents : [];
  delete reqFinanceTransaction.FinanceTransactionComponents;
  var reqFinanceTransactionComponentIds = {};
  reqFinanceTransactionComponents.forEach(function(financeTransactionComponent){
    reqFinanceTransactionComponentIds[financeTransactionComponent.id] = financeTransactionComponent;
  });
  var dbFinanceTransaction = undefined;
  var dbFinanceTransactionComponents = undefined;
  dbService.sequelize.transaction(function(transaction){
    return dbService.FinanceTransaction.findOne({where: {UserId: req.user.id, id: reqFinanceTransaction.id}, include: [dbService.FinanceTransactionComponent], transaction: transaction}).then(function(financeTransaction){
      if(financeTransaction == null){
        return dbService.FinanceTransaction.create(reqFinanceTransaction, {transaction: transaction}).then(function(createdTransaction){
          dbFinanceTransaction = createdTransaction;
          dbFinanceTransactionComponents = [];
          return createdTransaction.setUser(req.user, {transaction: transaction});
        });
      } else {
        dbFinanceTransaction = financeTransaction;
        dbFinanceTransactionComponents = financeTransaction.FinanceTransactionComponents;
        return dbFinanceTransaction.update(reqFinanceTransaction, {transaction: transaction});
      }
    }).then(function(){
      var existingFinanceTransactionComponentIds = {};
      dbFinanceTransactionComponents.forEach(function(financeTransactionComponent){
        existingFinanceTransactionComponentIds[financeTransactionComponent.id] = financeTransactionComponent;
      });
      var newFinanceTransactionComponents = reqFinanceTransactionComponents.filter(function(financeTransactionComponent){
        return existingFinanceTransactionComponentIds[financeTransactionComponent.id] === undefined;
      }).map(function(financeTransactionComponent){
        delete financeTransactionComponent.id;
        return financeTransactionComponent;
      });
      var deletedFinanceTransactionComponents = dbFinanceTransactionComponents.filter(function(financeTransactionComponent){
        return reqFinanceTransactionComponentIds[financeTransactionComponent.id] === undefined;
      });
      var updatedFinanceTransactionComponents = reqFinanceTransactionComponents.filter(function(financeTransactionComponent){
        return existingFinanceTransactionComponentIds[financeTransactionComponent.id] !== undefined;
      }).map(function(financeTransactionComponent){
        delete financeTransactionComponent.balance;
        return financeTransactionComponent;
      });
      return dbService.sequelize.Promise.all(
        deletedFinanceTransactionComponents.map(function(financeTransactionComponent){
          return financeTransactionComponent.destroy({transaction: transaction});
        })
      ).then(function(){
        return dbService.sequelize.Promise.all(newFinanceTransactionComponents.map(function(financeTransactionComponent){
          return dbService.FinanceTransactionComponent.create(financeTransactionComponent, {transaction: transaction}).then(function(financeTransactionComponent){
            return financeTransactionComponent.setFinanceTransaction(dbFinanceTransaction, {transaction: transaction});
          });
        }));
      }).then(function(){
        return dbService.sequelize.Promise.all(updatedFinanceTransactionComponents.map(function(financeTransactionComponent){
          return existingFinanceTransactionComponentIds[financeTransactionComponent.id].update(financeTransactionComponent, {transaction: transaction});
        }));
      }).then(function(){
        return dbFinanceTransaction.reload({transaction: transaction});
      }).then(function(financeTransactionComponent){
        res.send(financeTransactionComponent.toJSON());
      });
    });
  }).catch(next);
});

/* POST transactions. */
router.delete('/transactions/transaction/:id', function(req, res, next) {
  dbService.sequelize.transaction(function(transaction){
    return dbService.FinanceTransaction.findOne({where: {UserId: req.user.id, id: req.params.id}, include: [dbService.FinanceTransactionComponent], transaction: transaction}).then(function(financeTransaction){
      if(financeTransaction != null)
        return financeTransaction.destroy({transaction: transaction}).then(function(){
          res.send(financeTransaction.toJSON());
        });
      res.send("Error");
    });
  }).catch(next);
});

/* GET user. */
router.get('/user', function(req, res, next) {
  var user = req.user.toJSON();
  delete user.password;
  res.send(user);
});

/* POST user. */
router.post('/user', function(req, res, next) {
  var reqUser = req.body;
  delete reqUser.id;
  dbService.sequelize.transaction(function(transaction){
    return req.user.update(reqUser).then(function(user){
      user = user.toJSON();
      delete user.password;
      res.send(user);
    });
  }).catch(next);
});

/* GET currencies. */
router.get('/currencies', function(req, res, next) {
  res.send(currencies.all.map(function(currency){
    return { currencyCode: currency.code, displayName: currency.name };
  }).sort(function(a, b){
    return a.displayName.localeCompare(b.displayName);
  }).filter(function(currency){
    //TODO: migrate to a better currency code library?
    //This excludes a really ugly currency name
    return currency.currencyCode !== "USS";
  }));
});

/* GET analytics tags. */
router.get('/analytics/tags', function(req, res, next) {
  dbService.FinanceTransaction.findAll({where: {UserId: req.user.id}, attributes: ['tags']}).then(function(financeTransactions){
    var tagsSet = new Set([""]);
    financeTransactions.forEach(function(financeTransaction){
      financeTransaction.tags.forEach(function(tag){
        tagsSet = tagsSet.add(tag);
      });
    });
    res.send(Array.from(tagsSet));
  }).catch(next);
});

/* POST analytics. */
router.post('/analytics', function(req, res, next) {
  analyticsService.buildReport(req.user, req.body).then(function(report){
    res.send(report);
  }).catch(next);
});

/* GET export */
router.post('/export', function(req, res, next) {
  dbService.exportData(req.user).then(function(exportedData){
    res.attachment('vogon-' + new Date().toJSON() + '.json');
    res.send(JSON.stringify(exportedData, null, "\t"));
  }).catch(next);
});

/* POST import */
router.post('/import', upload.single('file'), function(req, res, next) {
  var data = req.file.buffer.toString();
  dbService.sequelize.transaction(function(transaction){
    return dbService.importData(req.user, JSON.parse(data), {transaction: transaction}).then(function(){
      res.send(true);
    });
  }).catch(next);
});

/* Error handler */
router.use(function(err, req, res, next) {
  console.error(i18n.__("An error has occurred: %s, stack trace:\n%s"), err, err.stack);
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = router;
