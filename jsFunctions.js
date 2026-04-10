function show(image) {
	var zoomedImage = new Image();

	zoomedImage.src = $(image).attr('src');
	var zoom = document.getElementById("zoom");
	thumbnailWidth = $(image).width();
	thumbnailHeight = $(image).height();
	thumbnailOffset = $(image).offset();

	if($("#zoom").is(':visible')){
		zoom.onload = imageLoaded(true, image);
    }
	else {
		zoom.onload = imageLoaded(false, image);
	}
	zoom.src = $(image).attr('src');
}

function imageLoaded( opened, zoomedImage ) {
	var scroll = $(window).scrollTop();
	var zoomWidth, zoomHeight;
	var zoomLeft, zoomTop;

	if (opened) {

		if (thumbnailWidth > thumbnailHeight){
			zoomWidth = thumbnailWidth * (oldZoomWidth / thumbnailWidth);
			zoomHeight = thumbnailHeight * (oldZoomWidth / thumbnailWidth);
		} else {
			zoomWidth = thumbnailWidth * (oldZoomHeight / thumbnailHeight);
			zoomHeight = thumbnailHeight * (oldZoomHeight / thumbnailHeight)
		}
		$("#zoom").animate({left: ($(window).width() / 2), top: scroll + ($(window).height() / 2)}, 0);
		$("#zoom").animate({width: zoomWidth + 'px', height: zoomHeight + 'px' }, 500);
	} else {
		$("#zoom").css({width: thumbnailWidth, height: thumbnailHeight});
		$("#zoom").css({top: thumbnailOffset.top + thumbnailHeight/2, left: thumbnailOffset.left + thumbnailWidth/2, position:'absolute'});
		if (thumbnailWidth < thumbnailHeight){
			zoomHeight = $(window).height() * 0.75;
			zoomWidth = thumbnailWidth / thumbnailHeight * zoomHeight;
		} else {
			zoomWidth = $(window).width() * 0.75;
			zoomHeight = thumbnailHeight / thumbnailWidth * zoomWidth;
		}
		if (zoomHeight > ($(window).height() * 0.75)) {
			zoomHeight = $(window).height() * 0.75;
			zoomWidth = thumbnailWidth / thumbnailHeight * zoomHeight;
		}
		$("#zoom").animate({left: ($(window).width() / 2), top: scroll + ($(window).height() / 2), width: zoomWidth + 'px', height: zoomHeight + 'px' }, 500);
	}
	oldZoomWidth = zoomWidth;
	oldZoomHeight = zoomHeight;
	$("#zoom").show();
}

function hide() {	
	$("#zoom").animate({top: thumbnailOffset.top + thumbnailHeight/2, left: thumbnailOffset.left + thumbnailWidth/2, width: thumbnailWidth + 'px', height: thumbnailHeight + 'px' }, 500);
    $("#wrap").removeClass("blur");
    $("#zoom").hide(0);
}

function addClass(id, classToAdd) {
	document.getElementById(id).classList.add(classToAdd);
}

function removeClass(id, classToRemove) {
	element = document.getElementById(id);
	element.classList.remove(classToRemove);
}

$(window).scroll(function() {
    if($("#zoom").is(':visible')){
    	$("#zoom").css({left: ($(window).width() / 2), top: ($(window).scrollTop() + ($(window).height() / 2))});
    }
});

function hideMenu() {
	$("#menuOptions").css({display: 'none'});
	
}
function showMenu() {
	$("#menuOptions").css({display: 'block'});
}

$(document).ready(function() {
   	if ($(window).width() <= 1240) {
		var divs = document.getElementsByTagName("div");

		for (var i = 0; i < divs.length; i++) {
			var element = divs[i];
			element.classList.remove("sectionimage");
		}
	}
});

$(window).on('resize', function(){
	var divs = document.getElementsByTagName("div");
	if ($(window).width() <= 1240) {
		for (var i = 0; i < divs.length; i++) {
			var element = divs[i];
			element.classList.remove("sectionimage");
		}
	}
});