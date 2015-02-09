var app = angular.module("demo", ["oauth2", "ui.router"]);

app.config(function ($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode(false);

    $urlRouterProvider.otherwise('/home');

    $stateProvider.state('home', {
        url: '/home',
        templateUrl: '/app/demo/home.html',
    }).state('voucher', {
        url: '/voucher',
        templateUrl: '/app/demo/voucher.html',
        controller: 'VoucherCtrl',
        restricted: true
    }).state('login', {
        url: '/login?requestedUrl',
        templateUrl: '/app/demo/login.html',
        controller: 'LoginCtrl'
    }).state('logout', {
        url: '/logout',
        templateUrl: '/app/demo/logout.html',
        controller: 'LogoutCtrl'
    });

});

// app.constant("apiUrl", "http://localhost:42344");
app.constant("apiUrl", "http://steyer-sample-apis.azurewebsites.net");

app.run(function (oauthService, $http, $state, $rootScope, $location, apiUrl) {

    oauthService.rngUrl = apiUrl + "/api/random";
    oauthService.loginUrl =  apiUrl + "/authorization";
    //oauthService.redirectUri = location.origin + "/index.html";
    oauthService.redirectUri = location.origin + "/callback.html";
    
    oauthService.clientId = "myClient";
    oauthService.scope = "voucher";

    $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {

        
        if (toState.restricted && !oauthService.getIsLoggedIn()) {
            event.preventDefault();
            var requestedUrl = $state.href(toState, toParams);
            $state.transitionTo("login", { requestedUrl: requestedUrl });
        }

    });

    if (oauthService.getIsLoggedIn() || oauthService.tryLogin()) {
        $http.defaults.headers.common['Authorization'] = 'Bearer ' + oauthService.getAccessToken();
        
        if (oauthService.state) {
            $location.url(oauthService.state.substr(1)); // führendes # abschneiden
        }
    }

    $rootScope.global = {};
    $rootScope.global.logOut = function () {
        oauthService.logOut();
        $state.go("login");
    }

});

app.controller("VoucherCtrl", function ($scope, $http, oauthService, apiUrl) {

    $scope.model = {};

    $scope.model.message = "";
    $scope.model.buyVoucher = function () {
        $http
            .post(apiUrl + "/api/voucher?betrag=150", null)
            .then(function (result) {
                $scope.model.message = result.data;
        })
        .catch(function (message) {
                $scope.model.message = "Was not able to receive new voucher: " + message.status;
        });
    }

    $scope.refresh = function () {
        oauthService
            .tryRefresh()
            .then(function () {
                $scope.model.message = "Got Token!";
                $http.defaults.headers.common['Authorization'] = 'Bearer ' + oauthService.getAccessToken();
            })
            .catch(function () {
                $scope.model.message = "Error receiving new token!";
            });
    }

});

app.controller("LoginCtrl", function ($scope, $stateParams, oauthService, $http) {

    $scope.model = {
        requestedUrl: $stateParams.requestedUrl,
        callback: function(requestedUrl) {
            $http.defaults.headers.common['Authorization'] = 'Bearer ' + oauthService.getAccessToken();
        }
    };

});

app.controller("LogoutCtrl", function (oauthService) {
    oauthService.logOut();
})