sch.factory('$schLoader', ['$http', '$q', function($http, $q) {
    var urlAdditional = '';

    //data cache
    var cache = {};
    window.cache = cache;

    function loadResource(filename) {
        return $http({
            method: 'GET',
            url: 'test_data/' + filename + urlAdditional,
            cache: true
        });
    }

    function storeIntoCache(cacheName, options) {
        options = options || {};
        if (cache[cacheName] && !options.force) return function() {};
        return function(resp) {
            return cache[cacheName] = resp;
        };
    }

    return {
        data: cache,
        initClassConf: function() {
            return $q.all([
                loadResource('classtable_course.json').success(storeIntoCache('course')),
                loadResource('classtable_teacher.json').success(storeIntoCache('teacher'))
            ]);
        },
        loadClassTableIndex: function() {
            return loadResource('classtable_tables.json').success(storeIntoCache('table'));
        },
        loadClassTable: function(id) {
            var filename = 'classtable_' + id;
            return loadResource(filename + '.json');
        },
        getPlainText: function(config) {
            //override response transform and must use cache to prevent infinite loop.
            config.cache = true;
            config.transformResponse = angular.identity;
            return $http(config);
        }
    };
}]);

sch.factory('$schSender', ['$http', function($http) {

    function transformRequest(obj) {
        var str = [];
        for (var p in obj)
            str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
        return str.join('&');
    }

    return {
        sendComments: function(data) {
            return $http.post('api/comment.php', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: transformRequest
            });
        },
        explainError: function(resp) {
            if (!resp) return null;
            var msg = resp.msg;
            if (!msg) return null;
            if (msg.indexOf('invalid email') >= 0)
                return '電子郵件無效！';
            if (msg.indexOf('writing') >= 0)
                return '寫入資料庫時失敗！';
            return null;
        },

    };
}]);

sch.factory('$schFormHelper', function() {
    return {
        reset: function(form) {
            form.$setUntouched();
            form.$setPristine();
        },
        watchDirty: function($scope, formName, callback) {
            $scope.$watch(formName + '.$dirty', callback);
        }
    }
});

sch.factory('$schFormSubmission', ['$schSender', '$schFormHelper', function($schSender, $schFormHelper) {
    return {
        submitCommentForm: function($scope, type, getFormModel) {
            return function(form, model) {
                model.type = type;
                if (form.$valid) {
                    $scope.state = 'loading';
                    $schSender.sendComments(model).success(function(resp) {
                        $scope.state = 'success';
                        //reset form
                        $scope.formModel = getFormModel();
                        $schFormHelper.reset(form);
                    }).error(function(resp, code) {
                        $scope.state = 'error';
                        $scope.errorReason = $schSender.explainError(resp);
                    });
                }
            };
        }
    };
}]);
