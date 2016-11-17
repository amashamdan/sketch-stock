$(document).ready(function() {
	$.get("/load-data", function(data, status) {
		$(".wait").fadeOut();
		console.log(data);
	});
});