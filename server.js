var express = require("express");
//var secure = require("express-force-https");
var mongodb = require("mongodb");
var ejs = require("ejs");
var yahooFinance = require("yahoo-finance");

var app = express();
//app.use(secure);

app.use("/stylesheets", express.static(__dirname + "/views/stylesheets"));
app.use("/scripts", express.static(__dirname + "/views/scripts"));

var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.STOCKS;

MongoClient.connect(mongoUrl, function(err, db) {
	if (err) {
		res.end("Failed to connect to database.")
	} else {
		var companies = db.collection("companies");
		app.get("/", function(req, res) {
			res.render("index.ejs");
		});

		app.get("/load-data", function(req, res) {
			var time = new Date();
			var currentYear = time.getYear() + 1900;
			var pastYear = currentYear - 1;
			var day = time.getDate();
			var month = time.getMonth() + 1;

			var symbols = [];
			companies.find({}).toArray(function(err, result) {
				symbols = result[0].symbols;
				yahooFinance.historical({
					symbols: symbols,
					from: pastYear + "-" + month + "-" + day,
					to: currentYear + "-" + month + "-" + day
				}, function (err, result) {
					res.send(result);
					res.end();
				});
			});
		});
	}
});


var port = Number(process.env.PORT || 443);
app.listen(port);