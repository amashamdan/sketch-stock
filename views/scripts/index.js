/* Creating a web socket for this client. */
var socket = io.connect("https://sketch-stock.herokuapp.com");
/* This global variable holdds the codes of the companies to be looek up by yahoo-finance api. */
var names;
/* Since data retrieved from the api may not be in the same order they were requested, this array will hold the companies' name in the order they are retrieved from the api. */
var sortedNames = [];
/* This array will hold the loaded stock data from thr api. */
var loadedStocks = [];
$(document).ready(function() {
    /* "results event handler. This event is initiated in the server when companies' list is retrieved from the database." */
    socket.on("results", function(results) {
        /* The prepareSketch function is called with reload parameter set to true. */ 
        prepareSketch(results, true);
    });
    /* Add company form submit handler. */
    $("form").submit(function(e) {
        /* Submission is paused. */
        e.preventDefault();
        /* False means the entered code is not in the list of sketched companies. */
        var found = false;
        /* The entered code is compared to the list of codes stored in sortedNames (names array won't necessarily have all names). */
        for (var name in sortedNames) {
            if (sortedNames[name] == $("#search-field").val().toUpperCase()) {
                /* If the entered code is found in sortedNames, found is set to true. */
                found = true;
            }
        }
        /* If found is true, the user is alerted that the code is already listed. */
        if (found) {
            alert("The company is already added... Looks like you're not even paying attention :D");
        } else {
            /* If found is false, prepareSketch function is called with the value of the entered code and reload set to false (because a company is added and we are not reloading data. */
            prepareSketch($("#search-field").val().toUpperCase(), false);
            /* Wait div is shown to the user. */
            $(".wait").show();
        }
    });
});
/* This function actes as intermediate step is manipulating data. It takes a list of codes and a boolean variable 'reload.' */
function prepareSketch(results, reload) {
    /* If reload is true (we want to reloa all data), the list of codes is stored in names, sortedNames and loadedStocks are reset to empty arrays. */
    if (reload) {
        names = results;
        sortedNames = [];
        loadedStocks = [];
        /* getData is called, additionStatus is passed as false to indicate that this is not called to add a company (reload could be passed instead :)) */
        getData(names, false);
    } else {
        /* If reload is false (when we add a code, we only want to load that code's data, not all other codes), names is reset and then the code is pushed into names. */
        names = [];
        names.push(results);
        /* getData called with additionStatus as true since this is resulting from adding a company code. */
        getData(names, true);
    }
}
/* getData function, it loads the stock data for the provided list 'names'. */
function getData(names, additonStatus) {
    /* We want to retrieve data for a whole year. Current and past year dates are found and saved. */
    var time = new Date();
    var currentYear = time.getYear() + 1900;
    var startYear = currentYear - 2;
    var day = time.getDate();
    var month = time.getMonth() + 1;
    /* The first part of the url for yahoo finance api. */
    var url = 'https://query.yahooapis.com/v1/public/yql';
    /* These variables store date strings in the format required by yahoo-finance api. */
    var startDate = startYear + "-" + month + "-" + day;
    var endDate = currentYear + "-" + month + "-" + day;
    /* The follwing loop grabs the stock data for each code in names array whether its a newly added code or multiple codes when page is loaded. */
    for (var name in names) {
        /* data variables is a string and is a part of the yahoo-fiance url. The company's code, start and end dates are inserted in the string. */
        var data = encodeURIComponent('select * from yahoo.finance.historicaldata where symbol in ("'+ names[name] +'") and startDate = "' + startDate + '" and endDate = "' + endDate + '"');
        /* callback function for getJSON method. It manipulates the retrieved data which are passed as parameter. */
        var callback = function(data) {
            /* If the api doesn't return results (represented by data.query.count), it means that the code doesn't exist. And the user is alerted the message to check the code. */
            if (data.query.count == 0) {
                alert("Data could not be retrieved... Maybe the company exists only in your imagination. Check the code and try again.");
                /* The wait message is faded out. */
                $(".wait").hide();
            /* If results are returned, the following executes. */
            } else {
                /* if true, it means a new company is added, and the server is notified of the new addition. */
                if (additonStatus) {
                    socket.emit("newCompany", $("#search-field").val().toUpperCase());
                }
                /* The retrieved data for a certain stock are pushed into loadedStocks. */
                loadedStocks.push(data);
                /* The code of the company for which data are retrieved is pushed into sortedNames. Again, data and name are pushed in order as they arrive from the api. */
                sortedNames.push(data.query.results.quote[0].Symbol);
                /* This executes when the whole data reloads (page loaded or company removed). */
                if (!additonStatus && loadedStocks.length == names.length) {
                    startSkecth(sortedNames, loadedStocks);
                /* This only executes if a company is added. */
                } else if (additonStatus) {
                    startSkecth(sortedNames, loadedStocks);
                }
            }
        }
        /* getJSON method to request data from yahoo finance api for each company code. */
        $.getJSON(url, 'q=' + data + "&env=http%3A%2F%2Fdatatables.org%2Falltables.env&format=json", callback);
    }
}
/* This ia the function which manipulates retrieved data and calls sketching function. */
function startSkecth(sortedNames, loadedStocks) {
    /* This array hold extracted data from data which were retrieved by yahoo-finance api. */
    var sketchData = [];
    /* For each code, an ampty array is pushed into sketchData. This is needed for the dataSeries which the highchart library uses to create the chart. Each element is sketchData is a 2-element array. Date and closing value of each stock. */
    for (var i = 0; i < sortedNames.length; i++) {
        sketchData.push([]);
    }
    /* This variable will indicate the position (index) of the pushed data to sketchData. Once data for a company are completely extracted. it will be incremented. */
    var counter = 0;
    /* Loops through all items in loadedStocks, each representing a dataset for a company. */
    for (var loadedStock in loadedStocks) {
        /* The stock data for each company consist of an array of points. Each consists of data for a single day. We need to extract date and closing value of each data point for each dataset (for each company). */
        for (var entry in loadedStocks[loadedStock].query.results.quote) {
            /* The date of each stock is converted to Epoch time. This is the format needed by highcharts. */
            var stockTime = new Date(loadedStocks[loadedStock].query.results.quote[entry].Date);
            /* The closing date and value of each stock is pushed into sketchData.*/
            sketchData[counter].unshift([stockTime.getTime(), Number(loadedStocks[loadedStock].query.results.quote[entry].Close)]);
        }
        /* counter is incremented when stock data for a company is completely added. */
        counter++;
    }
    /* This array will hold data series from which the chart is created. */
    var seriesOptions = [];
    /* Codes list on the display are removed. */
    $(".company-div").remove();
    /* For each name (code) in sortedNames, the following executes. */
    $.each(sortedNames, function (i, name) {
        /* For each company, an object is pushed to data series, the object has two keys, name (code) and stock data. Stock data are found in sketchData. */
        seriesOptions[i] = {
            name: name,
            data: sketchData[i]
        };
        /* A div representing each company is appended to company-div. */
        $(".companies").append("<div class='company-div'><p class='company-header'>"+ name +"</p><button class='delete-button' id='" + name + "'>X</button></div>");           
    });
    // This should be here after the buttons are actually added. IF placed before, the handler wouldn't register because $(".delete-button") would not select anything because the buttons are not actually there.
    $(".delete-button").click(function() {
        /* if one company is displayed, a message is alerted. The user cannot remove all companies. */
        if (sortedNames.length == 1) {
            alert("You should have at least one company! What's the point of the chart with nothing to show??")
        } else {
            /* If more than one company exist, wwait div fades in. */
            $(".wait").fadeIn();
            /* delete event is emitted to the server. */
            socket.emit("delete", $(this).attr("id"));
        }
    });
    /* The wait div fades out, and createChart function called. */
    $(".wait").fadeOut();
    createChart(seriesOptions);
}
/* This function draws the chart. */
function createChart(seriesOptions) {
    /* Chart options. */
    Highcharts.stockChart('chart', {
        rangeSelector: {
            /* Will show 1 year data by default. */
            selected: 4
        },
        yAxis: {
            labels: {
                formatter: function () {
                    return (this.value > 0 ? ' + ' : '') + this.value + '%';
                }
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: 'red'
            }]
        },
        /* colors to be used for data series. */
        colors: ['#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066', '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
        plotOptions: {
            series: {
                compare: 'percent',
                showInNavigator: true
            }
        },
        tooltip: {
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
            valueDecimals: 2,
            split: false
        },
        /* seriesOptions created in prepareSketch function and passed as parameter to this function. */
        series: seriesOptions
    });
}