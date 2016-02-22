app.controller("TransactionsController", function ($scope, $interval, $route, TransactionsService, AuthorizationService, AccountsService, UserService, TagsService) {
  $scope.transactionsService = TransactionsService;
  $scope.authorizationService = AuthorizationService;
  $scope.accountsService = AccountsService;
  $scope.tagsService = TagsService;
  $scope.editingTransaction = undefined;
  $scope.userService = UserService;
  $scope.filterTimer = undefined;
  $scope.filterDirty = false;
  $scope.filterDateCalendar = {opened: false};
  $scope.viewVisible = function(){
    return $route.current.controller !== "TransactionsController";
  };
  $scope.addTransaction = function () {
    var transaction = {FinanceTransactionComponents: [], date: TransactionsService.getDate(), tags: [], type: TransactionsService.defaultTransactionType.value};
    $scope.transactionsService.transactions.unshift(transaction);
    $scope.startEditing(transaction);
  };
  $scope.startEditing = function (transaction) {
    $scope.editingTransaction = transaction;
    if (transaction.id === undefined) {
      var transactionsTable = $("div[id='transactionsTable']");
      var docViewTop = $(window).scrollTop();
      var docViewBottom = docViewTop + $(window).height();
      if (transactionsTable.position().top < docViewTop || transactionsTable.position().top > docViewBottom)
        $('html, body').animate({scrollTop: transactionsTable.position().top}, "slow");
    }
  };
  $scope.duplicateTransaction = function (transaction) {
    var newTransaction = angular.copy(transaction);
    newTransaction.id = undefined;
    newTransaction.version = undefined;
    newTransaction.date = TransactionsService.getDate();
    newTransaction.amount = undefined;
    newTransaction.FinanceTransactionComponents.forEach(function (component) {
      component.id = undefined;
      component.version = undefined;
    });
    $scope.transactionsService.transactions.unshift(newTransaction);
    $scope.startEditing(newTransaction);
  };
  $scope.openFilterDateCalendar = function ($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.filterDateCalendar.opened = true;
  };
  $scope.applyFilter = function () {
    $scope.filterDirty = true;
    if ($scope.filterTimer === undefined) {
      $scope.filterTimer = $interval(function () {
        $scope.filterDirty = false;
        TransactionsService.update().then(function () {
          $scope.filterTimer = undefined;
          if ($scope.filterDirty)
            $scope.applyFilter();
        });
      }, 1000, 1);
    }
  };
  $scope.$watch(function () {
    return AuthorizationService.authorized;
  }, function () {
    $scope.$applyAsync(TransactionsService.update);
  });
});
