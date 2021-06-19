var express = require('express');
var router = express.Router();
var mongo = require("../mongodb.js");
var cheerio = require("cheerio");
var fs = require("fs");

/* GET users listing. */
router.get('/', function(req, res, next) {
  // res.send('respond with a resource');
  res.end(fs.readFileSync("./html/user.html"));
});

router.post('/log_in', function(request, response){
  var que = {"name":request.query.usr, "manage":1};
  var col = {};
  var seq = {};
  response.writeHead(200, {"Content-Type": "application/json"});
  mongo.search_user(que, col, seq, function(result){
      if(result.length == 1){
          var user = result[0];
          if (request.query.pw == user["passwd"]){
              response.write(JSON.stringify("TRUE"));
              response.end();
              var lg = {"user":request.query.usr,"op":"manage_log_in","state":"SUCCESS","time":Date.now()}
              mongo.insert_logs(lg)
          } else {
              response.write(JSON.stringify("FALSE")); 
              response.end();
              var lg = {"user":request.query.usr,"op":"manage_log_in","state":"FAILURE","time":Date.now()}
              mongo.insert_logs(lg)
          }
      } else {
          var lg = {"user":request.query.usr,"op":"manage_log_in","state":"FAILURE","time":Date.now()}
          mongo.insert_logs(lg)
          response.write(JSON.stringify("FALSE"));
          response.end();
      }
  });
});

module.exports = router;
