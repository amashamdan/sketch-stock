var express = require("express");

var mongodb = require("mongodb");

var app = express();


var server = require('http').createServer(app);
var io = require("socket.io")(server);

var ejs = require("ejs");


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
			getStock(companies, client, "firstLoad");
			client.on("newCompany", function(company) {
				companies.update(
					{},
					{"$addToSet": {"symbols": company}},
					function() {
						getStock(companies, client, "companyAdded");
					}
				);
			});
			client.on("delete", function(company) {
				companies.update(
					{},
					{"$pull": {"symbols": company}},
					function() {
						getStock(companies, client, "companyRemoved");
					}
				)
			});
		});
		app.get("/", function(req, res) {
			res.render("index.ejs");
		});
	}
});

function getStock(companies, client, status) {
	var symbols = [];
	companies.find({}).toArray(function(err, result) {
		symbols = result[0].symbols;
		if (status == "companyAdded") {
			client.broadcast.emit("results", symbols);
		} else if (status == "firstLoad") {
			client.emit("results", symbols);
		} else if (status == "companyRemoved") {
			client.broadcast.emit("results", symbols);
			client.emit("results", symbols);
		}
	});
}

var port = Number(process.env.PORT || 8080);
/* NOTICE server.listen NOT app.listen */
server.listen(port);