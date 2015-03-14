
// var x = [], y = [];

// //data generator, simulate json data
// var gen = [
//  {name: '高一', start: 1289},
//  {name: '高二', start: 1316},
//  {name: '高三', start: 1343}
// ];

// gen.forEach(function(v){
//  var classArr = [];
//  for(var i = 0; i < 27; i++){
//      var token = v.start + i;
//      classArr.push({
//          id: token,
//          label: token + ' 班',
//          url: token + '.json'
//      });
//  }
//  x.push({
//      label: v.name,
//      data: classArr
//  });

// });
// //x is now the data set

// var catL = [], classL = [];
// for(var i = 0, c = x.length; i < c; i++){
//  var catName = x[i].label;
//  catL.push({
//      label: catName
//  });
//  var y = x[i].data;
//  for(var j = 0, d = y.length; j < d; j++){
//      classL.push(y[j]);
//      //add category info
//      //aka normalization
//      y[j].category = x[i].label;
//  }
// }
