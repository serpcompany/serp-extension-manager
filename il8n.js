document.addEventListener('DOMContentLoaded', function () {
	
	//translates tooptips of the 3 top buttons
	document.getElementById('topbtn1').title = chrome.i18n.getMessage("html_topbtn_tooltip1");
	document.getElementById('topbtn2').title = chrome.i18n.getMessage("html_topbtn_tooltip2");
    document.getElementById('topbtn3').title = chrome.i18n.getMessage("html_topbtn_tooltip3");
	document.getElementById('blogbtn').title = chrome.i18n.getMessage("opt_blogbtn_tooltip");
	
	// auto-translate all elements with i18n attributes
	// this part is from the HTTPS-Everywhere extension
	var all = document.getElementsByTagName("*");
	for(var i=0, max=all.length; i < max; i++) {
		var label = all[i].getAttribute('i18n');
		if(label) {
		  all[i].innerHTML = chrome.i18n.getMessage(label);
		}
	}

});