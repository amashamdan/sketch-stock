$(document).ready(function() {
	$.get("/load-data", function(results, status) {
		$(".wait").fadeOut();

		var names = []
		for (var key in results) {
			names.push(key)
		}

		var data = [];
		for (var i = 0; i < names.length; i++) {
			data.push([]);
		}

		var counter = 0;
		for (var key in results) {
			for (var entry in results[key]) {
				var time = new Date(results[key][entry].date);
				data[counter].push([time.getTime(), results[key][entry].close]);
			}
			counter++;
		}

	    var seriesOptions = [];

	    function createChart() {

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

	    $.each(names, function (i, name) {

	            seriesOptions[i] = {
	                name: name,
	                data: data[i]
	            };
	                
	            
	        });
	    createChart();
	    });



	});
