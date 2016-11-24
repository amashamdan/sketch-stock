$(document).ready(function() {
	var socket = io.connect("http://localhost:8080");
	/*$.get("/load-data", function(results, status){
		sketch(results);
	});*/

	socket.on("results", function(results) {
		sketch(results);
	});

	$("form").submit(function(e) {
		e.preventDefault();
		$(".wait").fadeIn();
		//var formData = $(this).serialize();
		socket.emit("newCompany", $("#search-field").val());
		/*$.ajax({
			type: "POST",
			url: "/add",
			data: formData,
			success: function(result) {
				$(".company-div").remove();
				sketch(result);
			}
		});*/
	});
});

function sketch(results) {
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
        $(".companies").append("<div class='company-div'><p class='company-header'>"+ name +"</p><button class='delete-button' id='" + name + "'>X</button></div>");           
    });
    // This should be here after the buttons are actually added. IF placed before, the handler wouldn't register because $(".delete-button") would not select anything because the buttons are not actually there.
    $(".delete-button").click(function() {
		$.ajax({
			type: "DELETE",
			url: "/delete/" + $(this).attr("id")
		}).done(function(results) {
			$(".company-div").remove();
			sketch(results);
		})
	})
    
    createChart();
}