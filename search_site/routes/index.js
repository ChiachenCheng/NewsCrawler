var express = require('express');
var router = express.Router();
var mongo = require("../mongodb.js");
var cheerio = require("cheerio");
var fs = require("fs");

/* GET home page. */
router.get('/', function(req, res, next) {
    // res.render('index', { title: 'Express' });
    res.end(fs.readFileSync("./html/index.html"));
});

router.get('/process_get', function(request, response) {
    var or_array = [];
    var lg_array = [];
    if(request.query.title!=""){
        or_array.push({"title":{"$regex":request.query.title}})
        lg_array.push({"title":request.query.title})
    }
    if(request.query.keywords!=""){
        or_array.push({"keywords":{"$regex":request.query.keywords}})
        lg_array.push({"keywords":request.query.keywords})
    }
    if(request.query.content!=""){
        or_array.push({"content":{"$regex":request.query.content}})
        lg_array.push({"content":request.query.content})
    }
    if(request.query.all!=""){
        or_array=[{"title":{"$regex":request.query.all}}, {"keywords":{"$regex":request.query.all}}, 
                {"content":{"$regex":request.query.all}}, {"desc":{"$regex":request.query.all}}, 
                {"source_name":{"$regex":request.query.all}}, {"publish_date":{"$regex":request.query.all}}];
        lg_array.push({"all":request.query.all})
    }
    var que = {"$or":or_array};
    var col = {"_id":0, "source_encoding":0, "crawltime":0};
    var seq = {"publish_date": -1};

    mongo.search_web(que, col, seq, function(result){
        response.writeHead(200, {
            "Content-Type": "application/json"
        });
        response.write(JSON.stringify(result));
        response.end();
        var lg = {"user":request.query.usrname,"search_words":lg_array,"op":"search","state":"SUCCESS","time":Date.now()}
        mongo.insert_logs(lg)
    });
});

router.get('/time_analysis', function(request, response) {
    let $ = cheerio.load(fs.readFileSync("html/time.html"));
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

router.post('/register_page', function(request, response) {
    response.end(fs.readFileSync("./html/register.html"));
});

router.post('/register', function(request, response){
    var que = {"name":request.query.usrname};
    var col = {};
    var seq = {};
    mongo.search_user(que, col, seq, function(result){
        if(result.length == 0){
            var injson = {"name":request.query.usrname, "passwd":request.query.passwd, "available":1, };
            mongo.insert_user(injson);
            var lg = {"user":request.query.usrname,"passwd":request.query.passwd,"op":"sign_up","state":"SUCCESS","time":Date.now()}
            mongo.insert_logs(lg)
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write(JSON.stringify("注册成功！"));
            response.end();
        }
        else{
            var lg = {"user":request.query.usrname,"passwd":request.query.passwd,"op":"sign_up","state":"FAILURE","time":Date.now()}
            mongo.insert_logs(lg)
            response.writeHead(200, {"Content-Type": "application/json"});
            response.write(JSON.stringify("注册失败！请更换用户名！"));
            response.end();
        }
    });
});

router.post('/log_in', function(request, response){
    var que = {"name":request.query.usr};
    var col = {};
    var seq = {};
    response.writeHead(200, {"Content-Type": "application/json"});
    mongo.search_user(que, col, seq, function(result){
        if(result.length == 1){
            var user = result[0];
            if (request.query.pw == user["passwd"]){
                if (user["available"] == 1){
                    response.write(JSON.stringify("TRUE"));
                    response.end();
                    var lg = {"user":request.query.usr,"op":"log_in","state":"SUCCESS","time":Date.now()}
                    mongo.insert_logs(lg)
                } else {
                    response.write(JSON.stringify("登陆失败！您的账号已被停用！")); 
                    response.end();
                    var lg = {"user":request.query.usr,"op":"log_in","state":"FAILURE","time":Date.now()}
                    mongo.insert_logs(lg)
                }            
            } else {
                response.write(JSON.stringify("登陆失败！请检查您的密码！")); 
                response.end();
                var lg = {"user":request.query.usr,"op":"log_in","state":"FAILURE","time":Date.now()}
                mongo.insert_logs(lg)
            }
        } else {
            response.write(JSON.stringify("登陆失败！请检查您的用户名！"));
            response.end();
        }
    });
});

router.get('/search_page', function(request, response) {
    let user = request.query.user;
    let $ = cheerio.load(fs.readFileSync("./html/search.html"));
    $("p#user").text(user);
    response.end($.html());
});

module.exports = router;