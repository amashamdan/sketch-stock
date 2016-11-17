var express = require("express");
//var secure = require("express-force-https");
var mongodb = require("mongodb");
var ejs = require("ejs");

var app = express();
//app.use(secure);

app.use("/stylesheets", express.static(__dirname + "/views/stylesheets"));

var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.STOCKS;

MongoClient.connect(mongoUrl, function(err, db) {
	if (err) {
		res.end("Failed to connect to database.")
	} else {
		app.get("/", function(req, res) {
			res.render("index.ejs");
		});
	}
});


var port = Number(process.env.PORT || 443);
app.listen(port);