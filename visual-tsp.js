"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Global Variables
 */

var g_maxNodeCount = 9;
var g_coords_table = [];
var g_coords_table_prev = [];
var g_interval_handle_stack = [];
var g_web_socket;
var g_canvasNodeRadius = 12;
var g_canvasNodeFill = "#4D7FAE";
var g_mouseOnIndicatorRadius = 12;
var g_mouseOnStrokeParams = "5px #E08547";
var g_shortestRoute = [];
var g_2ndShortestRoute = [];
var g_first;
var g_displayed_text;
var g_displayed_instructions;
var g_RCOORDS = []; //React
var g_RPATHS = []; //React
var g_canvas;
var RInst; //React instance
var g_instructions = "Resolvedor de rutas\nInstrucciones:\n\nUn solo clic añade un nodo.\nDos clics seleccionan el nodo a recorrer.\nMantener presionado y arrastrar para reposicionar.\nLos nodos pueden ser movidos y editados por las coordenadas manualmente.\nEl área visible es de 700x700 pixeles.\nLos nodos máximos que se pueden agregar son 9.";
var g_client_side_path_calculation;

var g_store;
var g_id_store;
var g_node_count;

var g_lastEllipse;
var touchedOneEllipse = false;
var g_extraCoordsTable = [];
var g_selectedEllipse = {x:0, y:0};

/**
 * Global Constants
 */

const AMPLIFICATION_FACTOR = 0.0499999;

// message sending intervals in milliseconds
// more nodes --> longer path calculation duration --> more time between msgs needed
const MSG_SEND_INTERVAL_LOW = 300;
const MSG_SEND_INTERVAL_MIDDLE = 500;
const MSG_SEND_INTERVAL_HIGH = 1000;

const CANVAS_DIMENSION_PXLS = 700;
const DEFAULT_WS_ADDRESS = ((document.location.protocol==="https:")?"wss://":"ws://")+document.location.host+"/tsp";

const CB_ID_1 = 0; // checkbox identifier
const CB_ID_2 = 1; // checkbox identifier

const MIDDLE_SCREEN_X = 350;
const MIDDLE_SCREEN_Y = 350;

/**
 * Redux reducer patterns
 */
const ADD_NODE = 'ADD_NODE';
const REMOVE_NODE = 'REMOVE_NODE';
const REMOVE_ALL_NODES = 'REMOVE_ALL_NODES';
const CHANGE_X = 'CHANGE_X';
const CHANGE_Y = 'CHANGE_Y';
const CHANGE_DISTANCE = "CHANGE_DISTANCE";
const CHANGE_XY = 'CHANGE_XY';
const TOGGLE_1 = 'TOGGLE_1';
const TOGGLE_2 = 'TOGGLE_2';

/**
 * Redux operations
 */

function addNode(x, y, id) {
  return { type: ADD_NODE, x: x, y: y, id: id };
}

function removeNode(id) {
  return { type: REMOVE_NODE, id: id };
}

function removeAllNodes() {
  return { type: REMOVE_ALL_NODES };
}

function changeX(id, value) {
  return { type: CHANGE_X, id: id, value: value };
}

function changeY(id, value) {
  return { type: CHANGE_Y, id: id, value: value };
}

function changeXY(id, xvalue, yvalue) {
  return { type: CHANGE_XY, id: id, xvalue: xvalue, yvalue: yvalue };
}

function toggle_1() {
  return { type: TOGGLE_1 };
}

function toggle_2() {
  return { type: TOGGLE_2 };
}

function changeDistance(id, value){
  return { type: CHANGE_DISTANCE, id: id, value: value };
}

var initialState = {
  nodes: [],
  checkboxes: [true, false]
};

/**
 * Solver Application
 */

function solverApp() {
  var state = arguments.length <= 0 || arguments[0] === undefined ? initialState : arguments[0];
  var action = arguments[1];


  function func_filter(node) {
    if (node.id === action.id) {
      return false;
    }
    return true;
  }

  function func_change_X(node) {
    if (node.id === action.id) {
      return { x: action.value, y: node.y, id: node.id, distance: action.distance};
    }
    return { x: node.x, y: node.y, id: node.id, distance: node.distance};
  }

  function func_change_Y(node) {
    if (node.id === action.id) {
      return { x: node.x, y: action.value, id: node.id, distance: action.distance};
    }

    return { x: node.x, y: node.y, id: node.id, distance: node.distance};
  }

  function func_change_XY(node) {
    if (node.id === action.id) {
      return { x: action.xvalue, y: action.yvalue, id: node.id, distance: action.distance};
    }
    return { x: node.x, y: node.y, id: node.id, distance: node.distance};
  }

  function func_change_distance(node){
    if(node.id === action.id){
      return { x: action.xvalue, id: action.yvalue, id: node.id, distance: action.value};
    }

    console.log({ x: node.x, y: node.y, id: node.id, distance: node.distance});
    return { x: node.x, y: node.y, id: node.id, distance: node.distance};
  }

  switch (action.type) {

    case ADD_NODE:
      return Object.assign({}, state, {
        nodes: [].concat(_toConsumableArray(state.nodes), [{
          x: action.x,
          y: action.y,
          id: action.id,
          distance: action.distance
        }])
      });

    case REMOVE_ALL_NODES:
      return Object.assign({}, { nodes: [] }, { checkboxes: state.checkboxes });

    case REMOVE_NODE:
      return Object.assign({}, { nodes: state.nodes.filter(func_filter) }, { checkboxes: state.checkboxes });

    case CHANGE_X:
      return Object.assign({}, { nodes: state.nodes.map(func_change_X) }, { checkboxes: state.checkboxes });

    case CHANGE_Y:
      return Object.assign({}, { nodes: state.nodes.map(func_change_Y) }, { checkboxes: state.checkboxes });

    case CHANGE_XY:
      return Object.assign({}, { nodes: state.nodes.map(func_change_XY) }, { checkboxes: state.checkboxes });

    case CHANGE_DISTANCE:
      return Object.assign({}, { nodes: state.nodes.map(func_change_distance)}, {checkboxes: state.checkboxes});

    case TOGGLE_1:
      return Object.assign({}, { nodes: state.nodes }, { checkboxes: [state.checkboxes[0] ? false : true, state.checkboxes[1]] });

    case TOGGLE_2:
      return Object.assign({}, { nodes: state.nodes }, { checkboxes: [state.checkboxes[0], state.checkboxes[1] ? false : true] });

    default:
      return state;
  }
}

/**
 * Application boot
 */

function init() {

  g_id_store = new idHandler();
  g_id_store.init();
  g_store = Redux.createStore(solverApp);

  //let unsubscribe = store.subscribe( () => console.log(store.getState() ) );
  g_store.subscribe(function () {
    return coordsHandler();
  });

  var RPathsList = React.createClass({
    displayName: "RPathsList",

    handleOnChange: function handleOnChange(id, event) {
      if (id === CB_ID_1) {
        g_store.dispatch(toggle_1());
      } else {
        g_store.dispatch(toggle_2());
      }
    },
    render: function render() {
      var createItem = function (item) {
        var klass = '';
        if (!item.checked) {
          klass = 'rhide';
        }
        return React.createElement(
          "label",
          { key: item.id },
          React.createElement(
            "div",
            { id: "rpathslist" },
            React.createElement("input", { onChange: this.handleOnChange.bind(this, item.id), checked: item.checked, type: "checkbox" }),
            React.createElement(
              "span",
              null,
              item.string
            ),
            React.createElement(
              "span",
              { id: "rpathlen", className: klass },
              ", length: ",
              funcRound(item.length)
            )
          )
        );
      }.bind(this);

      return React.createElement(
        "div",
        null,
        this.props.items.map(createItem)
      );
    }
  });

  var RCoordsList = React.createClass({
    displayName: "RCoordsList",
    changeDistanceToNextNode(item, event){
      var distance = Number(event.target.value)/AMPLIFICATION_FACTOR;
      var next_node, pending, new_coords, isInverted;

      for(var index = 0; index < g_canvas.children.length-1; index++){
        if(g_canvas.children[index].model_id === (item.id+1)){
          next_node = g_canvas.children[index];
          pending = calculatePendingFromNode(item, next_node);
          isInverted = (next_node.x < item.x && (next_node.y < item.y || next_node.y > item.y));

          //set new coords to one node from distance and pending
          new_coords = setNewCoordsFromDistance(
            item, 
            distance, 
            pending,
            isInverted
          ); 

          //g_store.dispatch(changeDistance(item.id, distance_to_next_node*AMPLIFICATION_FACTOR));
          g_store.dispatch(changeXY(next_node.model_id, new_coords.x, new_coords.y));

          next_node.moveTo(new_coords.x, new_coords.y);
          break;
        }
      }
    },
    handleOnClick: function handleOnClick(id, event) {
      removeCanvasChildById(id);
      g_store.dispatch(removeNode(id));
      g_id_store.recycleId(id);
    },
    handleOnMouseLeave: function handleOnMouseLeave(id, event) {
      removeSurroundingEllipseById(id);
    },
    handleOnMouseEnter: function handleOnMouseEnter(id, event) {
      drawSurroundingEllipseById(id);
    },
    handleOnChangeX: function handleOnChangeX(id, event) {
      var child;
      var new_x = Number(event.target.value);
      g_store.dispatch(changeX(id, new_x));

      for (var index = 0; index < g_canvas.children.length; index++) {
        if (g_canvas.children[index].model_id === id) {
          child = g_canvas.children[index];
          child.moveTo(new_x, child.y);
          break;
        }
      }
    },
    handleOnChangeY: function handleOnChangeY(id, event) {
      var child;
      var new_y = Number(event.target.value);
      g_store.dispatch(changeY(id, new_y));

      for (var index = 0; index < g_canvas.children.length; index++) {
        if (g_canvas.children[index].model_id === id) {
          child = g_canvas.children[index];
          child.moveTo(child.x, new_y);
          break;
        }
      }
    },

    render: function render() {
      var createItem = function (item) {
        var klass = '';

        if (item.id === this.props.active) {
          klass = 'r_invert_colors';
        }
        return React.createElement(
          "div",
          { className: klass, id: "rcoordslist", key: item.id, onMouseLeave: this.handleOnMouseLeave.bind(this, item.id), onMouseEnter: this.handleOnMouseEnter.bind(this, item.id) },
          React.createElement("b", {}, item.id+". "),
          React.createElement("input", {type: "text", placeholder: "Lugar "+item.id, className: "client-input"}),
          React.createElement("input", { type: "text", onChange: this.handleOnChangeX.bind(this, item.id), value: item.x }),
          React.createElement("input", { type: "text", onChange: this.handleOnChangeY.bind(this, item.id), value: item.y }),
          React.createElement("input", { type: "text", value: item.distance, disabled: (item.id == 9)?true:false, onChange: this.changeDistanceToNextNode.bind(this, item)}),
          React.createElement("a", { className: "destroy", onClick: this.handleOnClick.bind(this, item.id) })
        );
      }.bind(this);

      return React.createElement(
        "div",
        null,
        this.props.items.map(createItem)
      );
    }
  });

  var RCoordsApp = React.createClass({
    displayName: "RCoordsApp",

    getInitialState: function getInitialState() {
      return { coords: [], paths: [] };
    },
    setRCoords: function setRCoords() {
      this.setState({ coords: g_RCOORDS });
    },
    setRPaths: function setRPaths() {
      this.setState({ paths: g_RPATHS });
    },
    setRActive: function setRActive(id) {
      this.setState({ active: id });
    },
    render: function render() {
      return React.createElement(
        "div",
        null,
        React.createElement(RPathsList, { items: this.state.paths }),
        React.createElement(RCoordsList, { items: this.state.coords, active: this.state.active })
      );
    }
  });

  RInst = ReactDOM.render(React.createElement(RCoordsApp, null), document.getElementById('coords_container'));

  g_canvas = oCanvas.create({
    canvas: "#myCanvas",
    fps: 60
  });

  g_canvas.bind("mousedown", addCanvasNodeMouse);
  //g_canvas.bind("mouseup", mouseUp);

  //g_canvas.bind("dblclick", addCanvasClick);

  g_canvas.bind("touchstart", addCanvasNodeTouch);
  //g_canvas.bind("touchend", mouseUp);

  if (localStorage.getItem("stored_ws_address")) {
    $("#socket_server_address").val(localStorage.getItem("stored_ws_address"));
  } else {
    $("#socket_server_address").val(DEFAULT_WS_ADDRESS);
  }

  checkCalculationSide();
  g_first = "";
  displayInitTextsOnCanvas();
  callReactRefPaths();
}

function callReactRefCoords() {
  var state = g_store.getState();

  g_RCOORDS.length = 0;

  for (var index = 0; index < state.nodes.length; index++) {
    g_RCOORDS.push({ x: state.nodes[index].x, y: state.nodes[index].y, id: state.nodes[index].id });
  }

  RInst.setRCoords();
}

function callReactRefPaths() {
  var state = g_store.getState();

  var lengths = [calculateRouteLength(g_shortestRoute), calculateRouteLength(g_2ndShortestRoute)];
  var checkeds = [state.checkboxes[0], state.checkboxes[1]];
  var pids = [0, 1];
  var strings = ["Mostrar ruta más corta", "Mostrar segunda ruta más corta"];

  g_RPATHS.length = 0;

  for (var i = 0; i < lengths.length; i++) {
    g_RPATHS.push({ length: lengths[i], checked: checkeds[i], id: pids[i], string: strings[i] });
  }

  RInst.setRPaths();
}

function addCanvasNodeTouch() {
  if (g_node_count > g_maxNodeCount - 1) {
    var obj = new textParamsObject("Se permite un máximo de 9 nodos");
    displayTextOnCanvas(obj, 2500);
    return;
  }

  removeInitTextsFromCanvas();

  removeLinesFromCanvas();

  var new_id = g_id_store.getNewId();

  addEllipseOnCanvas(createNewEllipse(this.touch.x, this.touch.y, new_id));

  g_store.dispatch(addNode(this.touch.x, this.touch.y, new_id));
}

function addCanvasNodeMouse() {
  if (g_node_count > g_maxNodeCount - 1) {
    var obj = new textParamsObject("Se permite un máximo de 9 nodos");
    displayTextOnCanvas(obj, 2500);
    return;
  }

  removeInitTextsFromCanvas();

  removeLinesFromCanvas();

  var new_id = g_id_store.getNewId();

  addEllipseOnCanvas(createNewEllipse(this.mouse.x, this.mouse.y, new_id));

  g_store.dispatch(addNode(this.mouse.x, this.mouse.y, new_id));
}

function updateStateCoords() {
  g_store.dispatch(changeXY(this.model_id, Math.round(this.abs_x), Math.round(this.abs_y)));
}

function mouseDown() {
  var interval = MSG_SEND_INTERVAL_LOW;

  // more nodes --> longer path calculation duration --> more time between msgs needed
  if (g_node_count) {
    if (g_node_count < 7) {
      interval = MSG_SEND_INTERVAL_LOW;
    } else if (g_node_count < 9) {
      interval = MSG_SEND_INTERVAL_MIDDLE;
    } else {
      interval = MSG_SEND_INTERVAL_HIGH;
    }
  }

  removeLinesFromCanvas();
  var interval_handle = setInterval(updateStateCoords.bind(this), interval);
  g_interval_handle_stack.push(interval_handle);
}

function mouseUp() {
  var index;
  var length = g_interval_handle_stack.length;

  for (index = 0; index < length; index++) {
    clearInterval(g_interval_handle_stack.shift());
  }

  g_store.dispatch(changeXY(this.model_id, Math.round(this.abs_x), Math.round(this.abs_y)));
}

function mouseClick(){
  console.log("Mouse Click");
  console.log(g_coords_table);
  console.log(touchedOneEllipse);

  console.table([this.x, this.y]);
  console.table((g_lastEllipse)?[g_lastEllipse.x, g_lastEllipse.y]:[0,0]);

  if(g_lastEllipse !== undefined 
      && g_lastEllipse.abs_x !== this.abs_x
      && g_lastEllipse.abs_y !== this.abs_y){
    //g_extraCoordsTable.push([g_lastEllipse.x, g_lastEllipse.y, 1]);
    g_extraCoordsTable.push([this.x, this.y, 1]);
  }

  // if(!touchedOneEllipse){
  //     g_lastEllipse = this;
  //     touchedOneEllipse = true;
  // }else if(g_lastEllipse !== this){
  //     g_extraCoordsTable.push([this.x, this.y, 1]);
  //     g_extraCoordsTable.push([g_lastEllipse.x, g_lastEllipse.y, 1]);
  //     touchedOneEllipse = false;
  // }

  g_store.dispatch(changeXY(this.model_id, Math.round(this.abs_x), Math.round(this.abs_y)));

  g_lastEllipse = this;
}

function removeCanvasNode() {
  removeLinesFromCanvas();
  if (this.model_id) {
    g_store.dispatch(removeNode(this.model_id));
    g_id_store.recycleId(this.model_id);
  }
  g_canvas.removeChild(this);
}

function drawSurroundingEllipse(target) {
  var ellipse = g_canvas.display.ellipse({
    x: 0,
    y: 0,
    radius: g_mouseOnIndicatorRadius,
    stroke: g_mouseOnStrokeParams,
    zIndex: "back"
  });

  target.addChild(ellipse);
  addTextOnEllipse(target, target.model_id);
}

function drawSurroundingEllipseById(id) {
  for (var index = 0; index < g_canvas.children.length; index++) {
    if (g_canvas.children[index].model_id === id) {
      drawSurroundingEllipse(g_canvas.children[index]);
      break;
    }
  }
}

function removeSurroundingEllipseById(id) {
  for (var index = 0; index < g_canvas.children.length; index++) {
    if (g_canvas.children[index].model_id === id) {
      g_canvas.children[index].removeChild(g_canvas.children[index].children[0]);
      break;
    }
  }
}

function removeCanvasChildById(id) {
  for (var index = 0; index < g_canvas.children.length; index++) {
    if (g_canvas.children[index].model_id === id) {
      g_canvas.removeChild(g_canvas.children[index]);
      break;
    }
  }
}

function mouseEnter() {
  drawSurroundingEllipse(this);
  RInst.setRActive(this.model_id);
}

function mouseLeave() {
  this.removeChild(this.children[0]);
  RInst.setRActive("");
}

function coordsHandler() {
  var frag_id_string = "";

  //drawRoutes();

  //take a copy of current global coords table
  g_coords_table_prev = g_coords_table.slice();
  //empty the global coords table
  g_coords_table.length = 0;

  var state = g_store.getState();
  g_node_count = state.nodes.length;

  //copy coords from current state to global coords table
  for (var index = 0; index < state.nodes.length; index++) {
    g_coords_table.push([state.nodes[index].x, state.nodes[index].y]);
    frag_id_string += state.nodes[index].x + "," + state.nodes[index].y + ",";

    // if(index == state.nodes.length-1)
    //   g_coords_table.push([state.nodes[0].x, state.nodes[0].y])
  }

  //g_coords_table = g_coords_table.concat(g_extraCoordsTable);

  // if(g_selectedEllipse.selected){
  //   g_coords_table.push([g_selectedEllipse.x, g_selectedEllipse.y]);
  // }

  //note that coords are in one dimensional table => 1 xy pair of coords takes 2 slots from the table

  history.replaceState(undefined, undefined, "#" + frag_id_string);

  if (g_coords_table.length > 3 && arraysAreEqual(g_coords_table, g_coords_table_prev)) {
    //return if coords have not changed
    return;
  }

  if (g_coords_table.length > 3) {
    //with more than 1 pair of coords in the table, send the table to path calculation
    //note that coords are in one dimensional table => 1 xy pair of coords takes 2 slots from the table
    sendMessage(g_coords_table);
  } else {
    //with less than 2 pair of coords, clear all routes from canvas
    g_shortestRoute.length = 0;
    removeLinesFromCanvas();
    callReactRefPaths();
  }

  if (g_coords_table.length < 7) {
    //with less than 4 pair of coords, clear 2nd shortest route table
    g_2ndShortestRoute.length = 0;
  }

  //update new coords to React components
  callReactRefCoords();

  if (g_coords_table.length === 0) {
    displayInitTextsOnCanvas();
  }

  if(g_node_count > 1)
    drawGraph();
}

function drawRoute(array, stroke_params) {
  var half_radius = g_canvasNodeRadius*0.5+1;
  var middle_point = {x:0, y:0};
  var first_point, second_point;

  for (var index = 0; index < array.length - 1; index++) {
    // if(array[index+1] === 1){
    //   index++;
    // }

    var line = g_canvas.display.line({
      start: { x: array[index][0], y: array[index][1] },
      end: { x: array[index + 1][0], y: array[index + 1][1] },
      stroke: stroke_params,
      cap: "round"
    });

    middle_point.x = (array[index][0]+array[index + 1][0])*0.5;
    middle_point.y = (array[index][1]+array[index + 1][1])*0.5;

    var distance = parseFloat(calculateDistance(array[index], array[index+1])*AMPLIFICATION_FACTOR).toFixed(2);

    var line_text = g_canvas.display.text({ 
      size: g_canvasNodeRadius+1,
      x: middle_point.x,
      y: middle_point.y,
      fill: "#000000",
      zIndex: "front",
      text: distance
    });

    /*
      Every 10 pixels is one kilometer (0.1 factor)
      Every 20 pixels is one kilometer (0.2 factor or 0.05)
    */

    g_canvas.addChild(line);
    g_canvas.children[g_canvas.children.length - 1].zIndex = "back";

    g_canvas.addChild(line_text);
  }
}

function calculateRouteLength(array) {
  var sum = 0;

  for (var index = 1; index < array.length; index++) {
    sum += calculateDistance(array[index - 1], array[index]);
  }

  return sum;
}

function calculateDistance(coords_1, coords_2) {
  if (!coords_2) {
    return 0;
  }
  var delta_x = coords_1[0] - coords_2[0];
  var delta_y = coords_1[1] - coords_2[1];
  return Math.sqrt(Math.pow(delta_x, 2) + Math.pow(delta_y, 2));
}

function calculateDistanceFromNode(node1, node2){
  var delta_x = node1.x - node2.x;
  var delta_y = node1.y - node2.y;

  return Math.sqrt(Math.pow(delta_x, 2) + Math.pow(delta_y, 2));
}

function calculatePendingFromNode(node1, node2){
  return ((node2.y-node1.y)/(node2.x-node1.x));
}

function setNewCoordsFromDistance(node, distance, pending, isInverted){
  var angle = Math.atan(pending);
  var delta_x = Math.cos(angle) * distance;
  var delta_y = Math.sin(angle) * distance;

  if(isInverted){
    delta_x *= -1;
    delta_y *= -1;
  }

  return {
    x: (node.x + delta_x),
    y: (node.y + delta_y)
  };
}

function removeLinesFromCanvas() {
  var index;

  for (index = 0; index < g_canvas.children.length; index++) {
    if (g_canvas.children[index].type === 'line') {
      g_canvas.removeChild(g_canvas.children[index]);
      --index;
    }
  }

  for (index = 0; index < g_canvas.children.length; index++) {
    if (g_canvas.children[index].type === 'text') {
      g_canvas.removeChild(g_canvas.children[index]);
      --index;
    }
  }
}

function openWebSocket() {
  g_web_socket = new WebSocket($("#socket_server_address").val().toLowerCase().trim());
  g_web_socket.onopen = function (evt) {
    checkWebSocketState();
  };
  g_web_socket.onclose = function (evt) {
    checkWebSocketState();
  };
  g_web_socket.onerror = function (error) {
    alert("Error! Can't connect to server.\nIs the server running?\nIs the address correct?");checkWebSocketState();
  };
  g_web_socket.onmessage = function (evt) {
    messageReceived(evt);
  };
}

function closeWebSocket() {
  // connecting = 0
  // open = 1
  // closing = 2
  // closed = 3

  var state = g_web_socket.readyState;

  if (state === 1 || state === 0) {
    g_web_socket.close();
    setTimeout(checkWebSocketState, 500);
  }
}

function checkWebSocketState() {
  // connecting = 0
  // open = 1
  // closing = 2
  // closed = 3

  var state = g_web_socket.readyState;

  if (state === 1) {
    $('#websocket_status').html("Estado de la conexión: Conectado");
    if ($("#connect_button").css("display") === 'inline') {
      g_coords_table.length = 0;
      coordsHandler();
    }
    $("#connect_button").css("display", "none");

    if (DEFAULT_WS_ADDRESS != g_web_socket.url.toLowerCase().trim()) {
      localStorage.setItem("stored_ws_address", g_web_socket.url.toLowerCase().trim());
    }
  } else if (state === 3) {
    $('#websocket_status').html('Estado de la conexión: Desconectado');
    $("#connect_button").css("display", "inline");
  } else {
    $('#websocket_status').html('Web socket connection status: N/A');
  }
}

function sendMessage(coords_table) {

  // if (g_client_side_path_calculation) {
  //   messageReceived(permutateRoutesAndFindShortest(coords_table), true);
  // } else {
  //   if (g_web_socket.readyState === 1) {
  //     g_web_socket.send(JSON.stringify(coords_table));
  //   }
  // }
}

function drawGraph(){
  removeLinesFromCanvas();
  drawRoute(g_coords_table, "'2px #E08547'");
  g_canvas.redraw();
  callReactRefPaths();
}

function messageReceived(evt, flag) {
  var array;

  if (flag) //client side permutation and shortest route finding
    {
      if (!evt) {
        return;
      }
      array = JSON.parse(evt);
    } else //server side permutation and shortest route finding
    {
      if (evt.data == 0) {
        return;
      }
      array = JSON.parse(evt.data);
    }

  removeLinesFromCanvas();

  g_first = array.shift();
  var length;

  if (g_first === 0) //received array contains only shortest path
    {
      length = array.length;
      g_shortestRoute = array.slice();
    } else if (g_first === 1) //received array contains both shortest and 2nd shortest paths
    {
      length = array.length;
      g_shortestRoute = array.slice(0, length / 2);
      g_2ndShortestRoute = array.slice(length / 2);
    }

  coordsHandler();
}

function drawRoutes() {
  var state = g_store.getState();

  removeLinesFromCanvas();

  if (g_first === 0) {
    if (state.checkboxes[0]) {
      drawRoute(g_shortestRoute, '2px #E08547');
    }
  } else if (g_first === 1) {
    if (state.checkboxes[0]) {
      drawRoute(g_shortestRoute, '2px #E08547');
    }
    if (state.checkboxes[1]) {
      drawRoute(g_2ndShortestRoute, '4px #ff0000');
    }
  }

  g_canvas.redraw();
  callReactRefPaths();
}

function arraysAreEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

function clearAllButton() {
  clearAll();
  displayInitTextsOnCanvas();
}

function funcRound(luku) //rounds to 2 decimal precision
{
  var result = Math.round(Number(luku) * 100) / 100;
  return result;
}

function displayInitTextsOnCanvas() {
  if (!g_displayed_text) {
    var obj = new textParamsObject("Presiona en esta área para añadir un nodo");
    g_displayed_text = displayTextOnCanvas(obj, 2500, true);
  }
  if (!g_displayed_instructions) {
    var obj = new textParamsObject(g_instructions);
    obj.y = 200;
    obj.font = "bold 17px sans-serif";
    obj.fill = "#808080";
    g_displayed_instructions = displayTextOnCanvas(obj, null, true);
  }
}

function removeInitTextsFromCanvas() {
  if (g_displayed_text) {
    g_canvas.removeChild(g_displayed_text);
    g_displayed_text = "";
  }

  if (g_displayed_instructions) {
    g_canvas.removeChild(g_displayed_instructions);
    g_displayed_instructions = "";
  }
}

function textParamsObject(string) {
  this.x = CANVAS_DIMENSION_PXLS / 2;
  this.y = 10;
  this.origin = { x: "center", y: "top" };
  this.font = "bold 30px sans-serif";
  this.text = string;
  this.fill = "#000";
}

function displayTextOnCanvas(object, duration, param) {
  var text, text_clone;

  text = g_canvas.display.text(object);

  if (param) {
    g_canvas.addChild(text);
    return text;
  }

  text_clone = text.clone({ y: CANVAS_DIMENSION_PXLS - 40 });

  g_canvas.addChild(text);
  g_canvas.addChild(text_clone);

  setTimeout(function () {
    g_canvas.removeChild(text);g_canvas.removeChild(text_clone);
  }, duration);
}

function hashChanged() {
  var i;
  var frag_id = location.hash;
  frag_id = frag_id.substr(1); //remove # character

  var frag_id_split = frag_id.split(",");

  var coords = [];

  for (i = 0; i < frag_id_split.length; i += 2) {
    if (!isNaN(frag_id_split[i])) {
      if (!isNaN(frag_id_split[i + 1])) {
        coords.push([Math.floor(Number(frag_id_split[i])), Math.floor(Number(frag_id_split[i + 1]))]);
      }
    }
  }

  if (coords.length > g_maxNodeCount) {
    var obj = new textParamsObject("Se permite un máximo de 9 nodos");
    displayTextOnCanvas(obj, 2500);
    return;
  } else if (coords.length > 0) {
    g_id_store.init();
    clearAll();
  } else {
    return;
  }

  for (i = 0; i < coords.length; i++) {
    var iidee = g_id_store.getNewId();
    addEllipseOnCanvas(createNewEllipse(coords[i][0], coords[i][1], iidee));
    g_store.dispatch(addNode(coords[i][0], coords[i][1], iidee));
  }
}

function clearAll() {
  for (var index = 0; index < g_canvas.children.length; index++) {
    g_canvas.removeChild(g_canvas.children[index]);
    --index;
  }
  g_store.dispatch(removeAllNodes());
  callReactRefCoords();
  callReactRefPaths();
  removeInitTextsFromCanvas();
  g_shortestRoute.length = 0;
  g_2ndShortestRoute.length = 0;
  g_selectedEllipse = {x:0, y:0, selected: false};
  g_extraCoordsTable = [];
  g_lastEllipse = null;
  touchedOneEllipse = false;
}

function createNewEllipse(x, y, id) {
  var radius = arguments.length <= 3 || arguments[3] === undefined ? g_canvasNodeRadius : arguments[3];
  var fill = arguments.length <= 4 || arguments[4] === undefined ? g_canvasNodeFill : arguments[4];

  return {
      meta: {
        x: x, 
        y: y, 
        id: id
      },
      ellipse: g_canvas.display.ellipse({
        x: x,
        y: y,
        radius: radius,
        fill: g_canvasNodeFill,
        model_id: id,
        zIndex: "back"
      })
  };
}

function addEllipseOnCanvas(o) {
  var dragOptions = { changeZindex: true, bubble: false };

  g_canvas.addChild(o.ellipse);
  o.ellipse.dragAndDrop(dragOptions);

  o.ellipse.bind("dblclick", selectCanvasNode);
  //o.ellipse.bind("click", mouseClick);
  o.ellipse.bind("mouseenter", mouseEnter);
  o.ellipse.bind("mouseleave", mouseLeave);
  o.ellipse.bind("mousedown", mouseDown);
  o.ellipse.bind("mouseup", mouseUp);

  o.ellipse.bind("dbltap", selectCanvasNode);
  o.ellipse.bind("touchenter", mouseEnter);
  o.ellipse.bind("touchleave", mouseLeave);
  o.ellipse.bind("touchstart", mouseDown);
  o.ellipse.bind("touchend", mouseUp);

  //touchedOneEllipse = false;

  //addTextOnEllipse(o.ellipse, o.meta.id);
}

function selectCanvasNode(){
  var canvas_element;

  for(var index = 0; index<g_canvas.children.length; index++){
    canvas_element = g_canvas.children[index];

    if(canvas_element.type === "ellipse"
      && canvas_element.model_id != this.model_id){
      canvas_element.fill = g_canvasNodeFill;
    }else if(canvas_element.type === "ellipse"
      && canvas_element.model_id === this.model_id)
      canvas_element.fill = "#000000";

    if(index === g_canvas.children.length-1){
      g_canvas.redraw();
    }
  }

  //g_selectedEllipse = {x: this.x, y: this.y, selected: true};
}

function addTextOnEllipse(target, id){
  var half_radius = g_canvasNodeRadius*0.5*-1;

  var ellipse_text = g_canvas.display.text({
    x: half_radius,
    y: half_radius,
    size: g_canvasNodeRadius+1,
    fill: "#ffffff",
    text: id,
    zIndex: "front"
  });

  target.addChild(ellipse_text);
}

function idHandler() {
  this.init = function () {
    this.recyclables = [];
    this.next_id = 0;
  };

  this.getNewId = function () {
    if (this.recyclables.length == 0) {
      return ++this.next_id;
    } else {
      return this.recyclables.pop();
    }
  };

  this.recycleId = function (id) {
    this.recyclables.push(id);
  };
}

function calculateFactorial(num) {
  var rval = 1;
  for (var i = 2; i <= num; i++) {
    rval = rval * i;
  }return rval;
}

function getRouteLength(permutation, coords, first) {
  var route_length = 0;

  for (var index = 0; index < permutation.length; index++) {
    route_length += calculateDistance(coords[permutation[index] - 1], coords[permutation[index + 1] - 1]);
  }

  route_length += calculateDistance(first, coords[permutation[0] - 1]);
  route_length += calculateDistance(first, coords[permutation[permutation.length - 1] - 1]);

  //truncate to four decimals because same route with different direction can have a small length difference
  return Math.round(Number(route_length) * 10000) / 10000;
}

function getCoordsByPermIndex(index) {
  return this[index - 1];
}

function permutateRoutesAndFindShortest(received_array) {
  var coords_array = [];

  for (var i = 0; i < received_array.length; i += 2) {
    var node = [received_array[i], received_array[i + 1]];
    coords_array.push(node);
  }

  if (coords_array.length < 3) {
    coords_array.unshift(0);
    return JSON.stringify(coords_array);
  }

  var perms_count = calculateFactorial(coords_array.length - 1);
  var permengine = new engine(coords_array.length - 1);
  var permutation;
  var shortest_permutation = [];
  var shortest_route_length = 1000000;
  var second_shortest_permutation;
  var second_shortest_route_length = 1000000;
  var route_length;
  var first_coords = coords_array.shift();

  for (var index = 0; index < perms_count; index++) {
    permutation = permengine.index2perm(index);
    route_length = getRouteLength(permutation, coords_array, first_coords);
    if (route_length < shortest_route_length) {
      second_shortest_route_length = shortest_route_length;
      //console.log("2nd: " + second_shortest_route_length + " " + index);
      second_shortest_permutation = shortest_permutation.slice();
      shortest_route_length = route_length;
      //console.log("shortest: " + shortest_route_length + " " + index);
      shortest_permutation = permutation;
    } else if (route_length < second_shortest_route_length && route_length > shortest_route_length) {
      second_shortest_route_length = route_length;
      //console.log("2nd: " + second_shortest_route_length + " " + index);
      second_shortest_permutation = permutation;
    }
  }

  var shortest_route_array = shortest_permutation.map(getCoordsByPermIndex, coords_array);
  shortest_route_array.unshift(first_coords); //beginning
  shortest_route_array.push(first_coords); //ending

  var second_shortest_route_array = [];
  var both_routes_array = [];
  if (second_shortest_route_length !== 1000000) {
    second_shortest_route_array = second_shortest_permutation.map(getCoordsByPermIndex, coords_array);
    second_shortest_route_array.unshift(first_coords); //beginning
    second_shortest_route_array.push(first_coords); //ending
    both_routes_array = shortest_route_array.concat(second_shortest_route_array);
    both_routes_array.unshift(1); //array to be returned contains both shortest and 2nd shortest paths
    return JSON.stringify(both_routes_array);
  }

  shortest_route_array.unshift(0); //array to be returned contains only shortest path
  return JSON.stringify(shortest_route_array);
}

function cbChanged() {
  checkCalculationSide(true);
  coordsHandler();
}

function checkCalculationSide(call_close) {
  if ($("#client_side_cb").is(":checked")) {
    g_client_side_path_calculation = true;
    if (call_close) {
      closeWebSocket();
    }
    //$("#connection_container").hide(1000);
    $("#connection_container").css("visibility", "hidden");
  } else {
    g_client_side_path_calculation = false;
    //$("#connection_container").show(1000);
    $("#connection_container").css("visibility", "visible");
    openWebSocket();
    checkWebSocketState();
  }
}

