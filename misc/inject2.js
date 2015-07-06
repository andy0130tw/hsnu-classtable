/*!
 * HSNU Classtable System (http://github.com/andy0130tw/hsnu-classtable)
 * Injection Script to dump data from the official classtable system.
 * Copyright 2014 Kuang-Lin Pan
 * Licensed under MIT (https://github.com/andy0130tw/hsnu-classtable/LICENSE)
 */

//Before injecting it into the browser, please check:
// 1. The session has not been expired.
// 2. The browser supports Console, ECMA5 array extras, and JSON API (optional localStorage).
// 3. The backend logic is fully tested. (If you want to save your data into files)
// 4. You have known what the script can do and cannot do.

(function() {

    //Add jQuery
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = 'http://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js';
    document.getElementsByTagName('head')[0].appendChild(s);

    //Polyfill for String.trim
    if (!String.prototype.trim) {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    //Define the backend.
    //With a little configuration,
    // we use it to export the organized data in the format of JSON.
    var DATA_DIST_HOST = 'http://localhost/hsnu_classtable/';
    var DATA_EXPORT_PATH = 'export.php';
    var DATA_VERSION_PATH = 'update_version.php';
    var fieldRegex = /(?:javascript:)?newWindow\('down\.asp\?sqlstr=([^,]*),?(.*)&type=([^\&]+)&.+','[^']+',''\);/;
    var pageNameRegex = /學期(.+) /;

    var TABLE_PREFIX = 'table.';

    var OPTION = {};

    //localStorage is only a place for storaging data across different session.
    // Only implement the required parts.
    var localStorageAdaper = (function() {
        var namespace = 'classtable.';
        return {
            getItem: function(key) {
                var data = localStorage.getItem(namespace + key);
                try {
                    return JSON.parse(data);
                } catch (e) {
                    return data;
                }
            },
            setItem: function(key, value) {
                if (typeof value == 'object')
                    value = JSON.stringify(value);
                return localStorage.setItem(namespace + key, value);
            },
            keys: function() {
                var k = [];
                for (var i = 0, s = ''; s = localStorage.key(i); i++) {
                    if (s.indexOf(namespace) != 0) continue;
                    k.push(s);
                }
                return k;
            }
        };
    })();

    function genUrl(code) {
        return code + '.json';
    }

    //Shortcut for getting elements by name
    function gbn(x) {
        return document.getElementsByName(x);
    }

    function processData($ext) {

        var classCode = '';
        var pageName = '';

        var dataArray = [];
        var list = [];

        var tdColumnCtrl = $ext.find('.tdColumn');
        //The data is strongly dependent on the DOM structure.
        //Assume data is in 6 x 10 format; which should be assert at first.
        if (tdColumnCtrl.length != 60) {
            throw new Error('The data does not fit into a 6 x 10 array! Modify the script according to the actual structure!');
        }

        var teacherHash = storage.teacher.data;
        var courseHash = storage.course.data;

        //inspect classCode, usually class
        var pageNameMatch = $ext.find('td.title').text().match(pageNameRegex);
        if (pageNameMatch) {
            pageName = pageNameMatch[1].trim();
            console.log('pageName set to ' + pageName);
        } else {
            console.warn('%cNo pageName found. The result will not be stored at all.', 'color: white; background: #ff9800;');
        }

        tdColumnCtrl.each(function(i) {
            var currentData = dataArray[i] = {};
            $(this).find('a').each(function() {
                var self = $(this);
                var context = self.text().trim();
                var metadata = self.attr('onclick').match(fieldRegex);
                if (!metadata) return;
                metadata.shift();
                var mode = metadata[2];
                if (mode == 'teacher') {
                    if (metadata[0]) {
                        (currentData.t = currentData.t || []).push(metadata[0]);
                        if (OPTION.d)
                            (currentData.tc = currentData.tc || []).push(context);
                        if (OPTION.t)
                            teacherHash[metadata[0]] = context;
                    }
                } else if (mode == 'course') {
                    if (metadata[1]) {
                        currentData.n = metadata[1];
                        if (OPTION.d)
                            currentData.nc = context;
                        if (OPTION.c)
                            courseHash[metadata[1]] = context;
                    }
                    if (!classCode && metadata[0]) {
                        classCode = metadata[0];
                        //console.log('  classCode set to ' + classCode);
                    }
                } else if (mode == 'room') {
                    //do nothing
                } else {
                    console.warn('%c  Unknown mode: ' + mode, 'color: white; background: #ff9800;');
                }
            });
        });

        //organize list; convert the data into 2D array
        //head up! that the data would be transposed!
        for (var i = 0, c = dataArray.length; i < c; i++) {
            var rowIdx = Math.floor(i / 6),
                colIdx = i % 6;
            var cell = dataArray[i];
            //check whether current cell is non-empty
            for (var _ in cell) {
                var row = (list[colIdx] = list[colIdx] || new Array(10));
                row[rowIdx] = cell;
                break;
            }
            //the field would remain undefined
        }
        //unused columns should be nulled manually
        // for (var i = 0; i < 6; i++)
        //     if (list[i] && list[i].length == 0)
        //         list[i] = null;

        if (OPTION.s) {
            var output = {
                class_code: classCode,
                class_name: pageName,
                list: list
            };
            localStorageAdaper.setItem(TABLE_PREFIX + classCode, output);
        }

        storage[classCode] = {
            modified: new Date() - 0,
            data: list
        };

        if (OPTION.m) {
            //modified date is stamped when finished.
            storage.standalone.data[classCode] = list;
        }

        if (OPTION.i)
            storage.tables[classCode] = {
                i: pageName,
                l: genUrl(classCode)
            };
    }

    function main(options) {

        if (!jQuery) throw new Error('jQuery haven\'t be loaded yet!');

        if (options == null) options = 'tciv';
        prepareOptions(options);

        var mainFrame = gbn('tableDownLeft')[0];
        var topFrame = gbn('tableTop')[0];

        var foreignDoc = topFrame.contentWindow.document;
        var foreign$GBI = function(id) {
            return $(foreignDoc.getElementById(id));
        };

        var $classSelectBox = foreign$GBI('s1');
        var $openSideSelectBox = foreign$GBI('selWindow1');
        var $arrangementSelectBox = foreign$GBI('selArrange1');

        //make a copy of all selections
        var classes = $classSelectBox.find('option').map(function() {
            return $(this).val();
        }).get();
        var classes_idx = 0;

        //rewind to the first term
        $classSelectBox.val(classes[0]);
        //ensure that content is rendered on the right side
        $openSideSelectBox.val('Left');
        //ensure that the columns is arranged from left to right
        $arrangementSelectBox.val('L');
        //init storage
        storage = {};
        if (OPTION.i)
            storage.tables = {};
        if (OPTION.t)
            storage.teacher = {
                data: {}
            };
        if (OPTION.c)
            storage.course = {
                data: {}
            };
        if (OPTION.m) {
            storage.standalone = {
                data: {}
            };
        }

        $(mainFrame).off().on('load', function() {
            console.info('%cLoad success: ' + $classSelectBox.val(), 'color: white; background: #03a9f4;');
            var extBody = this.contentWindow.document.body;
            //process and storage data here
            processData($(extBody));

            classes_idx = classes.indexOf($classSelectBox.val()) + 1;
            if (classes.length == classes_idx) {
                console.info('%cScanning finished.', 'color: white; background: #4caf50;');
                $(this).off();

                //write aggerated data into localStorage
                for (var k in storage)
                    localStorageAdaper.setItem(TABLE_PREFIX + k, storage[k]);

                //categorize
                categorizeTable(categorizeFN);

                if (OPTION.m) {
                    //stamp the modified
                    storage.standalone.modified = getTimeStamp();
                }

                return;
            }
            //console.log('getNext: ' + classes[classes_idx]);
            $classSelectBox.val(classes[classes_idx]).trigger('change');
        });

        //trigger
        $classSelectBox.val(classes[1]).trigger('change');
    }

    function categorizeTable(catFN) {
        var table = storage.tables;
        var group = {};
        var tokenToIdx = {};
        var idxToToken = [];
        var idxToKey = [];
        var currIdx = 0;
        //map each data to category id
        for (var k in table) {
            var token = catFN(table[k], k);
            var insertRef = null;
            if (tokenToIdx[token] == null) {
                var newKey = 'Category #' + (currIdx + 1) + ': ' + token;
                idxToToken.push(token);
                idxToKey.push(newKey);
                tokenToIdx[token] = currIdx++;
                group[newKey] = {};
                insertRef = group[newKey];
            } else {
                insertRef = group[idxToKey[tokenToIdx[token]]];
            }
            //insert like merging objects
            insertRef[k] = table[k];
        }
        storage.tables = {
            modified: getTimeStamp(),
            list: group
        };
    }

    function categorizeFN(v, k) {
        //the first character of the id
        return k[0];
    }

    function help() {
        console.log('%c* Execute "main(options)" with following available options(character):', 'font-size: 120%;');
        console.log(' - s: use localStorage to save data.');
        console.log(' - t: output teacher\'s ID file.');
        console.log(' - c: output course\'s ID file.');
        console.log(' - d: include the detailed data in the output (produce standalone files).');
        console.log(' - i: output table index file.');
        console.log(' - m: additionally produce an output file, merging all the tables.');
        console.log(' - v: generate version file based on this process.');
        console.log(' If no options are given, the default option is "tciv".');
        console.log('%c* After successful collecting data, execute "send(useLocalStorage)" to export data:', 'font-size: 120%;');
        console.log(' useLocalStorage: true if you want to export data from localStorage, false otherwise.');
    }

    function prepareOptions(options) {
        for (var i = 0, c = options.length; i < c; i++) {
            OPTION[options[i]] = true;
        }
    }

    function getTimeStamp() {
        return new Date() - 0;
    }

    function dumpData(fromLocalStorage) {
        var postData = {},
            updatedFiles = [];
        if (!fromLocalStorage) {
            for (var x in storage) {
                var v = JSON.stringify(storage[x]);
                postData['classtable.' + x] = v;
            }
        } else {
            var l = localStorageAdaper.keys();
            for (var i = 0, c = l.length; i < c; i++) {
                postData[l[i]] = localStorage.getItem(l[i]);
            }
        }
        if (OPTION.v)
            ['teacher', 'course', 'tables'].forEach(function(v) {
                if (postData['classtable.' + v])
                    updatedFiles.push(v);
            });

        var rtn = [];
        rtn.push(
            $.ajax(DATA_DIST_HOST + DATA_EXPORT_PATH, {
                type: 'POST',
                dataType: 'json',
                data: postData
            })
        );

        //update files 
        if (updatedFiles.length > 0 && DATA_VERSION_PATH)
            rtn.push(
                $.ajax(DATA_DIST_HOST + DATA_VERSION_PATH, {
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        update: JSON.stringify(updatedFiles),
                        timestamp: getTimeStamp()
                    }
                })
            );
        return rtn;
    }

    //Turn this on to kick things off!
    // You can simply call main() in the console after jQuery is finished loading.
    //void setTimeout(main,100);

    this.main = main;
    this.dumpData = dumpData;
    this.storage = {};

    return help();

})();
