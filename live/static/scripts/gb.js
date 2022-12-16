// Handle image refresh.
var newImage;
window.onload = function (){
	reimg = document.getElementById('game_img');
	setInterval(function (){
		reimg.src = 'https://gb.ezclap.xyz/image?r=' + Math.random();
	}, 1000)
}

function input(button){

	if(typeof button == 'number'){
		$.ajax({
			url: 'https://gb.ezclap.xyz/control?button=' + button + '&callback=https://gb.luevano.xyz',
			type: 'GET',
			complete: function(xhr){
				let statusCode = xhr.status;
				if(statusCode >= 400){
					console.log('Error code: ' + statusCode + '. On input: ' + button);
				}
			}
			});
	}
}

// jQuery/ajax for handling input.
$(document).ready(function (){

	$('#btn_right').click(function (){
		input(0);
	});

	$('#btn_left').click(function (){
		input(1);
	});

	$('#btn_up').click(function (){
		input(2);
	});

	$('#btn_down').click(function (){
		input(3);
	});

	$('#btn_a').click(function (){
		input(4);
	});

	$('#btn_b').click(function (){
		input(5);
	});

	$('#btn_select').click(function (){
		input(6);
	});

	$('#btn_start').click(function (){
		input(7);
	});

});
