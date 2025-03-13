document.addEventListener('DOMContentLoaded', function () {
	var settings = JSON.parse(localStorage.settings);
	var linkTag = document.getElementById('dark');
	
	if(settings.theme=="2"){
		linkTag.removeAttribute("href");
	}
	
	if(settings.theme=="3"){
		linkTag.removeAttribute("media");
	}
});