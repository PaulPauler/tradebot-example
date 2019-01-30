$(function() {
  var wsUrl = document.location.protocol + "//" + document.location.hostname + (document.location.port ? ":" + document.location.port : "");

  function getFormData($form){
      var unindexed_array = $form.serializeArray();
      var indexed_array = {};

      $.map(unindexed_array, function(n, i){
          indexed_array[n['name']] = n['value'];
      });

      return indexed_array;
  }

  function makeOrder($form) {
    var data = getFormData($form);
    console.log(data);
    socket.emit('newOrder', data, function(resp) {
      alert(resp);
    });
  }

  var socket = io.connect(wsUrl);

  socket.on('ticker', function (data) {
    if (!data || typeof data != 'object' ) return console.log("No Data");
    Object.keys(data).forEach(function (key) {
      if(key == 'last')$("#last-price").text(data[key]);
    });
  });

  socket.on('options', function (data) {
    if (!data || typeof data != 'object' ) return console.log("No Data");
    Object.keys(data).forEach(function (key) {
      $("#" + key).text(data[key]);
    });
  });

  socket.emit('init-candles', function (data, params) {
    if(!params.ready){
      initChart([], params);
      console.log('Loading chart. Wait please.');
    } else {
      initChart(data, params);
    }
  });

  socket.on('candles', function (data, params) {
    if(!params.ready){
      initChart([], params);
      console.log('Loading chart. Wait please.');
    } else {
      initChart(data, params);
    }
  });

  socket.on('error', function (error) {
    console.error(error);
  });

  socket.on('ema', function (ema) {
    $('#current-ema').text(ema);
  });

  /*Start/stop new session*/
  $('#startSession').submit(function(e) {
    e.preventDefault();
    let data = getFormData($(this));

    socket.emit('startSession', data, (error, cbc) => {
      // location.reload('true');
      if(error) {
        console.error(error);
      } else {
        console.log(cbc);
        location.reload('true');
      }
    });
  });

  /*Start/stop new session*/
  $('#endSession').click(function() {
    socket.emit('endSession', (error, cbc) => {
      if(error) {
        console.error(error);
      } else {
        console.log(cbc);
        location.reload('true');
      }
    });
  });

  /*Set worker options*/
  $('#set-options-form').submit(function(e) {
    e.preventDefault();
    let data = getFormData($(this));

    // socket.emit('new-worker', data.symbol, (cbc) => {
    //   console.log(cbc);
    // });

    socket.emit('setOptions', data, (error, cbc) => {
      if(error) {
        console.error(error);
      } else {
        console.log(cbc);
        location.reload('true');
      }
    });
  });

  $("#btnBuyMarket").click(function() { makeOrder($("#formBuyMarket")); });
  $("#btnBuyLimit").click(function() { makeOrder($("#formBuyLimit")); });
  $("#btnSellMarket").click(function() { makeOrder($("#formSellMarket"));});
  $("#btnSellLimit").click(function() { makeOrder($("#formSellLimit")); });
});
