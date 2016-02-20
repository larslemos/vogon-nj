app.controller("UserSettingsController", function ($scope, AuthorizationService, UserService, CurrencyService, HTTPService) {
  $scope.userService = UserService;
  $scope.currencies = CurrencyService;
  $scope.file = undefined;
  $scope.operationSuccessful = false;
  var importPostHeaders = {"Content-Type": undefined};
  $scope.submitEditing = function () {
    AuthorizationService.username = $scope.user.username;
    if ($scope.user.password !== undefined)
      AuthorizationService.password = $scope.user.password;
    UserService.submit($scope.user).then($scope.importData);
  };
  $scope.cancelEditing = function () {
    UserService.update();
  };
  $scope.setFile = function (file) {
    $scope.$apply(function () {
      $scope.file = file.files[0];
    });
  };
  $scope.importData = function () {
    if ($scope.file === undefined)
      return;
    var formData = new FormData();
    formData.append("file", $scope.file);
    return HTTPService.post("service/import", formData, importPostHeaders, undefined, angular.identity).then(function () {
      HTTPService.updateAllData();
    });
  };
  $scope.exportDataXML = function () {
    var form = $('<form>', {
      html: '<input type="hidden" name="access_token" value="' + AuthorizationService.access_token + '" />',
      action: "service/export/xml",
      method: "post"
    });
    form.appendTo(document.body).submit().remove();
  };
  $scope.exportDataJSON = function () {
    var form = $('<form>', {
      html: '<input type="hidden" name="access_token" value="' + AuthorizationService.access_token + '" />',
      action: "service/export/json",
      method: "post"
    });
    form.appendTo(document.body).submit().remove();
  };
  $scope.performCleanup = function () {
    $scope.operationSuccessful = false;
    $scope.userService.performCleanup().then(function () {
      $scope.operationSuccessful = true;
    });
  };
  $scope.performRecalculateBalance = function () {
    $scope.operationSuccessful = false;
    $scope.userService.performRecalculateBalance().then(function () {
      $scope.operationSuccessful = true;
    });
  };
  $scope.$watch(function () {
    return UserService.userData;
  }, function () {
    $scope.user = UserService.userData;
  });
});
