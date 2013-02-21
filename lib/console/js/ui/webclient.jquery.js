/*  
 * Instantiates WebClient(), binds document.ready()
 */

var web_client = new WebClient(io);

var REPORT_INTERVAL = 10 * 1000;

// Update statistics widget
setInterval(function() {
  var now = new Date();
  var elapsed = (now.getTime() - web_client.stats.start.getTime()) / 1000;
  var minutes = parseInt(elapsed / 60);
  var seconds = parseInt(elapsed % 60);
  var rate = web_client.stats.messages/elapsed;
  $("#stats")
    .find(".nodes b").html(web_client.stats.nodes).end()
    .find(".elapsed b").html(minutes + ":" + (seconds < 10 ? "0" : "") + seconds).end();
    //.find(".summary b").html((rate).toFixed(2));
},REPORT_INTERVAL/10);

// Event bindings, main method
$(document).ready(function() {
  var bottom_height = $(".stat:first").height();
  var bar_height = $(".bar:first").height();

  // Calculate individual screen size
  function calc_screen_size(scount) {
    if (!scount) { scount = $("#screens .screen").length; }
    var ssize = (($(window).height() - bottom_height - 20) / scount)
      - (bar_height + 53);
    return ssize;
  }
  
  // Resize screens
  web_client.resize = function(scount, resize_bottom) {
    if (!resize_bottom) { resize_bottom = true; }
    //$("#controls2, #right").height($(window).height());
    //$(".console").height(calc_screen_size(scount));
    var screen_width = $(window).width() - $("#controls2").width();
    $("#right" + (resize_bottom ? ", #bottom" : ""))
      .width(screen_width).css('max-width', screen_width);
  };
  $(window).resize(function() {
    web_client.resize();
  });

	//$("#run-button").css('display','none');
	$("#runcode-button").css('display','none');
	$("#codeinput").css('display','none');
	
  web_client.resize();
  
  $("#ready-button").click(function() {
  		var agent = $("#agentinput").val();
  		var user = $("#maxuserinput").val();
  		var message = {agent:agent,maxuser:user};
  		web_client.socket.emit('ready',message);
  		$(this).attr('disable',true);
  		$('#conndiv').html();
  		$('#run-button').css('display','none');
  });
  
  $("#run-button").click(function() {
		var agent = $("#agentinput").val();
		var maxuser = $("#maxuserinput").val();
		var message = {agent:agent,maxuser:maxuser};
		web_client.socket.emit('run',message);
		$("#hitdiv").html('Running...');
  	$('#run-button').css('display','none');
  });
  
  $("#sumbtn").click(function() {
		web_client.detailTimer = true;
  	showDetailAgent();
  });
  
  $("#avgbtn").click(function() {
		web_client.detailTimer = true;
  	showDetailAgentAvg();
  });
  
  $("#qsbtn").click(function() {
		web_client.detailTimer = true;
  	showDetailAgentQs();
  });
  
});
