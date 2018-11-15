var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var permutationEngine = require('permutation-engine');
var path = require("path");

app.use(express.static(path.join(__dirname+"/../../")));

app.listen(process.env.PORT || 9999, function () {
  console.log('Server listening on port '+ (process.env.PORT || 9999));
});

app.get("/", function(req, res){
  res.sendFile(path.join(__dirname+"/../../index.html"));
});

const AMPLIFICATION_FACTOR = 0.0499999;

class GeoStruct{
  constructor(){
    /**
     * Node example
     *
     * [x, y, "aK"] where aK is the name
     */
    this.routeStack = [];
    this.distance = 0;
  }

  toString(){
    let routeLength = this.routeStack.length-1;
    let route = "";

    for(let i=0; i<=routeLength; i++){
      if(routeLength !== i)
        route += "a"+this.routeStack[i][2]+" -> ";
      else
        route += "a"+this.routeStack[i][2];
    }

    return route;
  }

  addNode(node){
    console.log(node);
    this.routeStack.push(node);
  }

  calculateRouteDistance(){
    for(let i=0; i<=this.routeStack.length-1; i++){
      this.distance += calculateDistance(this.routeStack[i], this.routeStack[i+1]);
    }

    this.distance *= AMPLIFICATION_FACTOR;
  }
}

app.ws('/tsp', function(ws, req) {
  ws.on('message', function(msg) {
    var nodes = JSON.parse(msg);
    var indexSwapStack = [];
    var totalSwaps = (nodes.length-3)*(nodes.length-2);
    var nodesToSwap = nodes.length-2;
    var nodeGeoPoint;
    var nodeGeoStack = [];
    var node;
    var shortestRoute;

    console.log("[+] Receiving nodes");
    console.log(nodes);

    for(nodeIndex in nodes)
      indexSwapStack.push(parseInt(nodeIndex));

    //close with first node
    nodes.push(nodes[0]);
    indexSwapStack.push(0);

    console.log("[+] Created index stack");
    console.log(indexSwapStack);

    console.log("[+] Number of routes to make: "+nodesToSwap);
    console.log("[+] Routes generated: "+totalSwaps);

    for(let i=1, tmp=0; i<=nodesToSwap; i++){
      tmp = indexSwapStack[i];
      indexSwapStack[i] = indexSwapStack[i+1];
      indexSwapStack[i+1] = tmp;

      console.log("[+ ]Walking throw a new route");
      console.log(indexSwapStack);

      nodeGeoPoint = new GeoStruct();

      for(let w=0; w<indexSwapStack.length; w++){
        node = nodes[indexSwapStack[w]];
        node[2] = indexSwapStack[w]+1;

        nodeGeoPoint.addNode(node);

        if(w===(indexSwapStack.length-1)){
          indexSwapStack[i+1] = indexSwapStack[i];
          indexSwapStack[i] = tmp;

          nodeGeoPoint.calculateRouteDistance();
          nodeGeoStack.push(nodeGeoPoint);

          console.log("[+] Route");
          console.log(nodeGeoPoint.toString());
        }
      }

      console.log("[+] Node Stack");
      console.log(nodeGeoStack);

      //find the shortest route
      
      if(i===nodesToSwap){
        shortestRoute = nodeGeoStack[0];

        for(let w=1; w<nodeGeoStack.length; w++){
          if(shortestRoute.distance > nodeGeoStack[w].distance)
            shortestRoute = nodeGeoStack[w];

          if(w === nodeGeoStack.length-1){
            console.log("[+] Shortest route")
            console.log(shortestRoute);

            ws.send(JSON.stringify(shortestRoute.routeStack));
          }
        }
      }
    }

  //   for(var i = 0; i < received_array.length; i += 2)
  //     {
  //     var node = [received_array[i],received_array[i+1]];
  //     coords_array.push(node);
  //     }

  //   if(coords_array.length < 3)
  //     {
  //     coords_array.unshift(0);
  //     ws.send(JSON.stringify(coords_array));
  //     return;
  //     }

  //   var perms_count = calculateFactorial(coords_array.length - 1);
  //   var permengine = new permutationEngine(coords_array.length - 1);
  //   var permutation;
  //   var shortest_permutation = [];
  //   var shortest_route_length = 1000000;
  //   var second_shortest_permutation;
  //   var second_shortest_route_length = 1000000;
  //   var route_length;
  //   var first_coords = coords_array.shift();

  //   for(var index = 0; index < perms_count; index++)
  //     {
  //     permutation = permengine.index2perm(index);
  //     route_length = getRouteLength(permutation,coords_array,first_coords);
  //     if(route_length < shortest_route_length)
  //       {
  //       second_shortest_route_length = shortest_route_length;
  //       second_shortest_permutation = shortest_permutation.slice();
  //       shortest_route_length = route_length;
  //       shortest_permutation = permutation;
  //       }
  //     else if(route_length < second_shortest_route_length && route_length > shortest_route_length)
  //       {
  //       second_shortest_route_length = route_length;
  //       second_shortest_permutation = permutation;
  //       }
  //     }

  //   var shortest_route_array = shortest_permutation.map(getCoordsByPermIndex,coords_array);
  //   shortest_route_array.unshift(first_coords); //beginning
  //   shortest_route_array.push(first_coords); //ending

  //   var second_shortest_route_array = [];
  //   var both_routes_array = [];
  //   if(second_shortest_route_length !== 1000000)
  //     {
  //     second_shortest_route_array = second_shortest_permutation.map(getCoordsByPermIndex,coords_array);
  //     second_shortest_route_array.unshift(first_coords); //beginning
  //     second_shortest_route_array.push(first_coords); //ending
  //     both_routes_array = shortest_route_array.concat(second_shortest_route_array);
  //     both_routes_array.unshift(1); //array to be returned contains both shortest and 2nd shortest paths
  //     ws.send(JSON.stringify(both_routes_array));
  //     return;
  //     }

  //   shortest_route_array.unshift(0); //array to be returned contains only shortest path
  //   ws.send(JSON.stringify(shortest_route_array));
  });
});


function calculateDistance(coords_1, coords_2)
{
  if(!coords_2) {return 0;}
  var delta_x = coords_1[0] - coords_2[0];
  var delta_y = coords_1[1] - coords_2[1];
  return Math.sqrt( Math.pow(delta_x, 2) + Math.pow(delta_y, 2) );
}

function calculateFactorial(num)
{
    var rval=1;
    for (var i = 2; i <= num; i++)
        rval = rval * i;
    return rval;
}

function getRouteLength(permutation,coords,first)
{
  var route_length = 0;

  for(var index = 0; index < permutation.length; index++)
    {
    route_length += calculateDistance(coords[permutation[index]-1], coords[permutation[index+1]-1]);
    }

  route_length += calculateDistance(first, coords[permutation[0]-1]);
  route_length += calculateDistance(first, coords[permutation[permutation.length-1]-1]);

  //truncate to four decimals because same route with different direction can have a small length difference
  return Math.round(Number(route_length) * 10000) / 10000;
}

function getCoordsByPermIndex( index )
{
  return this[index -1];
}
