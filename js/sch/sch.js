(function() {

    var sch = window.sch = angular.module('hsnusch', ['lang', 'detectIE']);

    sch.run(['$rootScope', function($rootScope) {
        $rootScope.version = '0.1.1';
        $rootScope.versionText = 'ver. α-2';
        $rootScope.lastModified = '2015/2/24';
    }]);

    angular.module('detectIE', []).run(['$rootScope', function($rootScope) {
        var ua = navigator.userAgent.toLowerCase();
        if ((ua.indexOf('msie') != -1) && parseInt(ua.split('msie')[1])) {
            $rootScope.isLegacyIE = true;
        }
    }]);

    //todo: subject name abbr!
    angular.module('lang', []).filter('tR', function() {
        var hPrefix = '第';
        var hSuffix = '節';
        var digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
        var ampm = {
            'am': '上\n午',
            'pm': '下\n午'
        };
        var time = [
            '08:10 09:00',
            '09:10 10:00',
            '10:10 11:00',
            '11:10 12:00',
            '13:00 13:50',
            '14:00 14:50',
            '15:10 16:00',
            '16:10 17:00',
            '17:10 18:00'
        ];
        return function(input, type, modifier) {
            if (type == 'weekDay')
                return digits[input];
            if (type == 'ampm')
                return ampm[input];
            if (type == 'cCnt') {
                if (modifier == 'short')
                    return '' + (input + 1);
                return input + 1;
                return hPrefix + (digits[input]) + hSuffix;
            }
            if (type == 'cTime')
                return time[input];
        };
    }).filter('dateR', ['$filter', function($filter) {
        return function(date, format, tz) {
            return $filter('date')(date, 'yyyy年M月d日 HH:mm:ss', tz);
        };
    }]);

    sch.directive('schTable', function() {
        var weekDay = new Array(5);

        function transformData(resp, tables) {
            var teacherTable = tables.teacher.data;
            var courseTable = tables.course.data;
            var rawTable = resp.data;
            var aggHash = {};
            var aggResult = [];
            angular.forEach(rawTable, function(v, i) {
                if (!v) return;
                v.splice(0, 1);
                angular.forEach(v, function(w, j) {
                    if (!w) return;
                    v[j] = {};
                    v[j].course = courseTable[w.n] || w.n;

                    if (w.t) {
                        var teacherArr = v[j].teacher = [];
                        angular.forEach(w.t, function(z, k) {
                            teacherArr.push(teacherTable[z] || z);
                        });
                        v[j].teacher = teacherArr;
                    }

                    //naive hash key
                    var hashKey = w.n + (w.t ? w.t.join('') : '');

                    if (!aggHash[hashKey]) {
                        //assume teachers and courses are one-to-one
                        aggHash[hashKey] = {
                            key: hashKey,
                            course: v[j].course,
                            teacher: teacherArr,
                            count: 0
                        };
                    }
                    aggHash[hashKey].count++;
                });
            });

            //aggregate
            for (var o in aggHash) {
                aggResult.push(aggHash[o]);
            }

            aggResult.sort(function(a, b) {
                if (a.key < b.key) return -1;
                if (a.key > b.key) return 1;
                return 0;
            });

            return {
                data: resp,
                aggregation: aggResult
            };
        }

        function chunkTwo(arr) {
            var mid = Math.floor(arr.length / 2);
            return [arr.slice(0, mid), arr.slice(mid + 1)];
        }

        return {
            restrict: 'AE',
            templateUrl: 'template/classtable.html',
            scope: {},
            controller: ['$scope', '$rootScope', '$schLoader', function($scope, $rootScope, $schLoader) {
                $scope.state = 'initial';

                $scope.week = weekDay;
                $scope.tableName = '課表';
                $scope.currentClass = '';
                $scope.currentYear = '103';
                $scope.currentSemester = '2';

                //$scope.t=[[{course:'Dummy',teacher:'yummy'}]];

                $rootScope.$on('classListLoadError', function(evt, args) {
                    $scope.state = 'fatal';
                    $scope.failureObj = args;
                });

                $rootScope.$on('classListLoadSuccess', function(evt) {
                    $scope.state = 'ready';
                });

                $rootScope.$on('classChange', function(evt, args) {
                    $scope.state = 'loading';
                    //clear out the data
                    $rootScope.classTableData = null;
                    var classObj = args.newClass;

                    function render(classObj) {
                        var data = classObj.data;
                        $scope.tableNameType = 'default';
                        $scope.currentClass = classObj.title;
                        $scope.modified = new Date(classObj.modified);
                        $scope.t = data;
                        $scope.state = 'success';
                    }

                    function sendToRootScope(classObj) {
                        $rootScope.classTableData = classObj;
                        $rootScope.classTableAggregation = chunkTwo(classObj.aggregation);
                    }
                    
                    //check for cache in the class obj
                    if (classObj.processed) {
                        render(classObj);
                        sendToRootScope(classObj);
                        return;
                    }
                    
                    $schLoader.loadClassTable(classObj.id)
                        .success(function(resp) {
                            var result = transformData(resp, $schLoader.data);
                            classObj.processed = true;
                            classObj.modified = resp.modified;
                            classObj.aggregation = result.aggregation;
                            classObj.data = resp.data;
                            render(classObj);

                            $rootScope.$broadcast('classLoadSuccess');
                            sendToRootScope(classObj);
                        })
                        .error(function() {
                            $scope.state = 'error';
                        });
                });
            }]
        };
    });

    sch.directive('schTableRow', function() {
        return {
            restrict: 'A',
            templateUrl: 'template/classtable-row.html',
            replace: true,
            scope: {
                i: '=rowId',
                c: '=rowspan',
                ampm: '=insertAmpm'
            },
            link: function(scope) {
                scope.$watch('$parent.t', function() {
                    scope.t = scope.$parent.t;
                });
            }
        };
    });

    sch.directive('schTableCell', function() {
        return {
            restrict: 'A',
            templateUrl: 'template/classtable-cell.html',
            scope: {
                v: '=rowData'
            }
        };
    });

    sch.directive('schClassSelector', ['$schLoader', function($schLoader) {

        var dropdownElem = null;
        var divisionStore = {};

        function division(mod) {
            var memoize = divisionStore[mod];
            if (memoize) return memoize;
            return divisionStore[mod] = function(v, i) {
                return v.index % 3 == mod;
            };
        }

        function loadClassTableIndex($scope) {
            var promise = $schLoader.loadClassTableIndex();
            promise.success(function(resp) {
                $scope.state = 'initial';
                $scope.dataModified = resp.modified;
                var respList = resp.list;
                for (var catLabel in respList) {
                    var list = respList[catLabel];
                    var dataArr = [];
                    $scope.categoryList.push({
                        label: catLabel,
                        data: list,
                        byIndex: dataArr
                    });
                    var cnt = 0;
                    for (var cId in list) {
                        var data = list[cId];
                        var record = {
                            id: cId,
                            category: catLabel,
                            index: cnt,
                            label: data.i,
                            title: parseInt(data.i),
                            url: data.l
                        };
                        cnt++;
                        $scope.classList.push(record);
                        //keep track of their indices
                        dataArr.push(record);
                    }
                }
                //default, not required
                $scope.selectedCategoryTab = $scope.categoryList[0];
                // $scope.selectedCategoryOption = $scope.selectedCategoryTab;
                // $scope.selectedItem = $scope.classList[0];
                $scope.state = 'success';
                $scope.$emit('classListLoadSuccess');
            });

            promise.error(function(resp, status, _, config) {
                $scope.state = 'error';
                var failureObj = {
                    reason: 'connection'
                };
                if (!resp && !status) {
                    //likely parse error, re-request again to get why
                    $schLoader.getPlainText(config).success(function(resp) {
                        try {
                            angular.fromJson(resp);
                        } catch (e) {
                            failureObj.message = e.message;
                        }
                    });
                    failureObj.url = config.url;
                    failureObj.reason = 'parse';
                }
                $scope.$emit('classListLoadError', failureObj);
            });
        }

        function loadClassTable(classObj) {
            return $schLoader.loadClassTable(classObj.id);
        }

        return {
            restrict: 'AE',
            scope: {},
            templateUrl: 'template/classSelector.html',
            controller: ['$scope', '$rootScope', '$schLoader', function($scope, $rootScope, $schLoader) {
                var categoryList = $scope.categoryList = [];
                var classList = $scope.classList = [];

                $scope.state = 'initial';

                $schLoader.initClassConf().then(function(resp) {
                    var courseM = resp[0].data.modified || -1;
                    var teacherM = resp[1].data.modified || -1;
                    var modifiedBigger = Math.max(courseM, teacherM);
                    if (modifiedBigger > 0)
                        $rootScope.modified = modifiedBigger;
                });
                loadClassTableIndex($scope);

                $scope.categoryFilter = function(v, i) {
                    if (!$scope.selectedCategoryTab)
                        return false;
                    return v.category == $scope.selectedCategoryTab.label;
                };

                $scope.selectCategory = function($event, obj) {
                    $scope.selectedCategoryTab = obj;
                    $event.stopPropagation();
                };

                $scope.selectClass = function(obj) {
                    $scope.selectedItem = obj;
                    //emit an event to kick off the loading process
                    $scope.$emit('classChange', {
                        newClass: obj
                    });
                };

                $scope.selectClassByList = function($event, obj) {
                    $scope.selectClass(obj);
                    //update the selected dropdown
                    $scope.selectedCategoryOption = $scope.selectedCategoryTab;
                };

                $scope.selectClassByOption = function(cat) {
                    var obj = cat.byIndex[this._selectOption];
                    $scope.selectClass(obj);
                    $scope.selectedCategoryOption = cat;
                    //revert selection
                    this._selectOption = '';
                    //close dropdown
                    $scope.closeDropdown();
                };

                $scope.division = division;

            }],
            link: function(scope, dom) {
                var STR_ukDropdown = 'uk-dropdown';
                //sadly jqLite has no delegation
                $(dom).on('click', 'a, .' + STR_ukDropdown, function(evt) {
                    if ($(evt.target).hasClass(STR_ukDropdown))
                        evt.stopPropagation();
                });
                scope.closeDropdown = function() {
                    //delayed closing. Not knowing why this works.
                    setTimeout(function() {
                        dom.removeClass('uk-open')
                    }, 0);
                };
                dropdownElem = dom.find('.' + STR_ukDropdown).eq(0);
            }
        };
    }]);

    sch.directive('schClassSelectorDropdown', function() {
        return {
            restrict: 'AE',
            link: function(scope, elem, attr) {
                $.UIkit.formSelect(elem, {
                    target: 'a > span',
                    label: scope.cat.label
                });
            }
        };
    });

    sch.controller('schModalReportCtrl', ['$scope', '$rootScope', '$schFormHelper', '$schFormSubmission', function($scope, $rootScope, $schFormHelper, $schFormSubmission) {
        $scope.state = 'initial';

        function getFormModel() {
            return {};
        }

        $rootScope.$watch('classTableData', function() {
            if ($rootScope.classTableData) {
                formModel.reportTarget = $rootScope.classTableData.id;
            }
        });

        var formModel = $scope.formModel = getFormModel();
        $scope.sendForm = $schFormSubmission.submitCommentForm($scope, 'report', getFormModel);

        $schFormHelper.watchDirty($scope, 'modalReportForm', function(newVal) {
            if (newVal && $scope.state == 'success') {
                $scope.state = 'initial';
            }
        });

    }]);

    sch.controller('schModalCommentCtrl', ['$scope', '$schFormHelper', '$schFormSubmission', function($scope, $schFormHelper, $schFormSubmission) {
        $scope.state = 'initial';

        function getFormModel() {
            return {
                vote: 5
            };
        }
        var formModel = $scope.formModel = getFormModel();
        $scope.sendForm = $schFormSubmission.submitCommentForm($scope, 'comment', getFormModel);

        $schFormHelper.watchDirty($scope, 'modalCommentForm', function(newVal) {
            if (newVal && $scope.state == 'success') {
                $scope.state = 'initial';
            }
        });

    }]);

    sch.directive('schUkTab', function() {
        return {
            restrict: 'A',
            scope: {
                'target': '=',
                'animation': '='
            },
            link: function(scope, elem, attr) {
                $(elem).find('.uk-tab').uk('tab', {
                    connect: scope.target,
                    animation: scope.animation
                });
            }
        }
    });

})()
