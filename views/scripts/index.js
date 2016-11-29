var socket = io.connect("http://localhost:8080");
var names;
var sortedNames = [];
var loadedStocks = [];
$(document).ready(function() {
    socket.on("results", function(results) {
        prepareSketch(results, true);
    });

    $("form").submit(function(e) {
        e.preventDefault();
        var found = false;
        for (var name in names) {
            if (names[name] == $("#search-field").val().toUpperCase()) {
                found = true;
            }
        }
        if (found) {
            alert("The company is already added... Looks like you're not even paying attention :D");
        } else {
            prepareSketch($("#search-field").val().toUpperCase(), false);
            $(".wait").show();
        }
    });
});

function prepareSketch(results, reload) {

    if (reload) {

        names = results;
        sortedNames = [];
        loadedStocks = [];
        getData(names, false);
    } else {
        names = [];
        names.push(results);
        getData(names, true);
    }
}

function getData(names, additonStatus) {

    var time = new Date();
    var currentYear = time.getYear() + 1900;
    var startYear = currentYear - 1;
    var day = time.getDate();
    var month = time.getMonth() + 1;
    var url = 'http://query.yahooapis.com/v1/public/yql';
    var startDate = startYear + "-" + month + "-" + day;
    var endDate = currentYear + "-" + month + "-" + day;
    
    var counter = 0;
    for (var name in names) {

        var data = encodeURIComponent('select * from yahoo.finance.historicaldata where symbol in ("'+ names[name] +'") and startDate = "' + startDate + '" and endDate = "' + endDate + '"');
        var callback = function(data) {
            if (data.query.count == 0) {
                alert("Data could not be retrieved... Maybe the company exists only in your imagination. Check the code and try again.");
                $(".wait").hide();
            } else {
                if (additonStatus) {
                    socket.emit("newCompany", $("#search-field").val().toUpperCase());
                }
                loadedStocks.push(data);
                sortedNames.push(data.query.results.quote[0].Symbol);
                if (!additonStatus && loadedStocks.length == names.length) {
                    startSkecth(sortedNames, loadedStocks);
                } else if (additonStatus) {
                    startSkecth(sortedNames, loadedStocks);
                }
            }
        }
        $.getJSON(url, 'q=' + data + "&env=http%3A%2F%2Fdatatables.org%2Falltables.env&format=json", callback);
    }
}

function startSkecth(sortedNames, loadedStocks) {
    var sketchData = [];
    for (var i = 0; i < sortedNames.length; i++) {
        sketchData.push([]);
    }
    var counter = 0;
    for (var loadedStock in loadedStocks) {
        for (var entry in loadedStocks[loadedStock].query.results.quote) {
            var stockTime = new Date(loadedStocks[loadedStock].query.results.quote[entry].Date);
            sketchData[counter].unshift([stockTime.getTime(), Number(loadedStocks[loadedStock].query.results.quote[entry].Close)]);
        }
        counter++;
    }
    var seriesOptions = [];
    $(".company-div").remove();
    $.each(sortedNames, function (i, name) {
        seriesOptions[i] = {
            name: name,
            data: sketchData[i]
        };
        $(".companies").append("<div class='company-div'><p class='company-header'>"+ name +"</p><button class='delete-button' id='" + name + "'>X</button></div>");           
    });
    // This should be here after the buttons are actually added. IF placed before, the handler wouldn't register because $(".delete-button") would not select anything because the buttons are not actually there.
    $(".delete-button").click(function() {
        if (sortedNames.length == 1) {
            alert("You should have at least one company! What's the point of the chart with nothing to show??")
        } else {
            $(".wait").fadeIn();
            socket.emit("delete", $(this).attr("id"));
        }
    });
    $(".wait").fadeOut();
    createChart(seriesOptions);
}

function createChart(seriesOptions) {
    Highcharts.stockChart('chart', {
        rangeSelector: {
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
        series: seriesOptions
    });
}