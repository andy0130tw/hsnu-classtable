# HSNU Classtable System

A modern, well-organized HSNU classtable system, which aims to provide an easier and more convenient way to look up the classtable of your class.

Written with AngularJS as a practice.

## Installing
````
npm install
gulp
````
Currently there is no test suite.

## Running
Simply open `dist/index.html` with a browser.

## About Injecting Script
This You may grab the table data by injecting the JS file [`misc/inject2.js`](misc/inject2.js) into the class table system. The injection script allows users to output only specified sections. The script is expected to be run in a modern browser. To get started:
  1. Write a simple backend to receive some JSON and write them into separated files.
  2. Modify the constants `DATA_*` at the beginning of the script. Select all, and then copy.
  3. Open your browser and navigate to [the official classtable](http://grades.hs.ntnu.edu.tw/classtable/).
  4. Open up the console (e.g. Press `Ctrl+Shift+K` in Firefox, or `F12` in Chrome). Paste the script and press enter to initialize it.
  5. If anything goes well, some help will be displayed in the console. Execute `main(...)` to collect all the data(This process may take several minutes). Then execute `dumpData(...)` to send them to the backend you wrote.
  6. Organize the files, create `test_data/` and place all files in with correct filename.

Please note that the paths should all be correct in order to produce data.
