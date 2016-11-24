var express = require("express");

var mongodb = require("mongodb");

var app = express();


var server = require('http').createServer(app);
var io = require("socket.io")(server);

var ejs = require("ejs");
var yahooFinance = require("yahoo-finance");


app.use("/stylesheets", express.static(__dirname + "/views/stylesheets"));
app.use("/scripts", express.static(__dirname + "/views/scripts"));

var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.STOCKS;

MongoClient.connect(mongoUrl, function(err, db) {
	if (err) {
		res.end("Failed to connect to database.")
	} else {
		var companies = db.collection("companies");
		io.on("connection", function(client) {
			getStock(companies, client);
			client.on("newCompany", function(company) {
				companies.update(
					{},
					{"$addToSet": {"symbols": company}},
					function() {
						getStock(companies);
					}
				);
			});
		});
		app.get("/", function(req, res) {
			res.render("index.ejs");
		});

		/*app.get("/load-data", function(req, res) {
			getStock(res,companies);
		});*/

		app.delete("/delete/:name", function(req, res) {
			companies.update(
				{},
				{"$pull": {"symbols": req.params.name}},
				function() {
					getStock(res, companies);
				}
			);
		});
	}
});

function getStock(companies, client) {
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
			client.emit("results", result);
		});
	});
}

var port = Number(process.env.PORT || 8080);
/* NOTICE server.listen NOT app.listen */
server.listen(port);