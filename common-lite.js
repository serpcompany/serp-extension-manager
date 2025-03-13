//Opera detector!
function isOpera(){
	var ans = false;
	if(window.navigator.vendor === "Opera Software ASA"||(window.navigator.userAgent).indexOf("OPR/")!=-1) ans = true;
	return ans;
}

function storeUrl(extID,giveG) {
	var storeURL; var isOpr = isOpera();
	if(!isOpr||giveG) {
		storeURL = "https://chrome.google.com/webstore/detail/" + extID;
	} else if (isOpr&&!giveG) {
		storeURL = "https://addons.opera.com/extensions/details/app_id/" + extID;
	} 
	return storeURL;
}