$(function() {
  var wsUrl = document.location.protocol + "//" + document.location.hostname + (document.location.port ? ":" + document.location.port : "");
  var socket = io.connect(wsUrl);
  
  /*Clear trades and sessions history*/
  $('#clearHistory').click(function() {
    socket.emit('clearHistory', (error, cbc) => {
      if(error) {
        console.error(error);
      } else {
        console.log(cbc);
        location.reload('true');
      }
    });
  });
});
