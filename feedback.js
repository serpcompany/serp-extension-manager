function linkSwitcher(link) {
	var extIDc = "";
	var extIDo = "SERP Extension Manager";
	
	var chr = "https://chrome.google.com/webstore/detail/"+extIDo+"/"+extIDc+"/support";
	var opr = "https://addons.opera.com/";
	var locale = window.navigator.language;
	var vendor = navigator.userAgent;
	var linkRef = link.href;
	
	if (vendor.indexOf("OPR") == -1) {
		link.href = chr + "?hl=" + locale;
	}
	if (vendor.indexOf("OPR") > -1) {
		if (locale.substr(0, 2) == "en")
			locale = "en";
		link.href = opr + locale.toLowerCase() + "/extensions/details/" + extIDo +"/?display="+ locale.toLowerCase() +"&reports#feedback-container";
	}
}

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('feedbkLnk').innerHTML = chrome.i18n.getMessage("feed_text2");
	linkSwitcher(document.getElementById('feedbkLnk'));
});