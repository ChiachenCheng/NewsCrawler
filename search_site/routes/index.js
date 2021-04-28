var express = require('express');
var router = express.Router();
var mongo = require("../mongodb.js");
var cheerio = require("cheerio");
var fs = require("fs");

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/process_get', function(request, response) {
    var or_array = [];
    if(request.query.title!="")
        or_array.push({"title":{"$regex":request.query.title}})
    if(request.query.keywords!="")
        or_array.push({"keywords":{"$regex":request.query.keywords}})
    if(request.query.content!="")
        or_array.push({"content":{"$regex":request.query.content}})
    if(request.query.all!="")
        or_array=[{"title":{"$regex":request.query.all}}, {"keywords":{"$regex":request.query.all}}, 
                {"content":{"$regex":request.query.all}}, {"desc":{"$regex":request.query.all}}, 
                {"source_name":{"$regex":request.query.all}}, {"publish_date":{"$regex":request.query.all}}]
    var que = {"$or":or_array};
    var col = {"_id":0, "source_encoding":0, "crawltime":0};
    var seq = {"publish_date": -1};

    mongo.search_web(que, col, seq, function(result){
        response.writeHead(200, {
            "Content-Type": "application/json"
        });
        response.write(JSON.stringify(result));
        response.end();
    });
});

router.get('/time_analysis', function(request, response) {
    let $ = cheerio.load(fs.readFileSync("public/time.html"));
    $("h1#kw").replaceWith(`<h1 id="kw">关键词 ${request.query.word} 的时间热度分析</h1>`);
    if(request.query.word==""){
        // response.write(JSON.stringify("no value"));
        $("table#tb").append(`<tr><td>NONE</td><td>0</td></tr>`);
        response.end(
            $.html()
        );
    } else {
        var que = {"keywords":{"$regex":request.query.word}};
        var col = {"_id":0, "publish_date":1};
        var seq = {"publish_date": -1};

        mongo.search_web(que, col, seq, function(result){
            // response.write(JSON.stringify(result));
            var m = new Map();
            for(var i = 0; i < result.length; i++){
                var date = result[i].publish_date;
                var temp = 0;
                if(m.has(date))
                    temp = m.get(date);
                m.set(date, temp + 1);
            }
            let obj= Object.create(null);
            for (let[k,v] of m) {
                obj[k] = v;
                $("table#tb").append(`<tr><td>${k}</td><td>${v}</td></tr>`);
            }
            // response.write(JSON.stringify(obj));
            response.end(
                $.html()
            );
        });
    }
});

module.exports = router;