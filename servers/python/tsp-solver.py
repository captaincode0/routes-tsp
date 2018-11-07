import tornado.httpserver
import tornado.websocket
import tornado.ioloop
import tornado.web
import json
import itertools
import math

class Coords:

    def __init__(self,coords,length):
        self.coords = coords
        self.length = float('%.7f' % length)

    def __eq__(self,other):
        index = -1

        for i in self.coords:
          if i[0] == other.coords[index][0] and i[1] == other.coords[index][1]:
            index-=1
          else:
            return False

        return True

    def __ne__(self,other):
        index = -1

        for i in self.coords:
          if i[0] == other.coords[index][0] and i[1] == other.coords[index][1]:
            return False
          else:
            index-=1

        return True

    def __lt__(self,other):
        if self.length < other.length:
          return True
        else:
          return False

    def __gt__(self,other):
        if self.length > other.length:
          return True
        else:
          return False

    def __hash__(self):
        return int(self.length * 1000000)

    def len(self):
      return self.length

    def route(self):
      return self.coords

def permutate(dataList):
  coord_list = []

  if(len(dataList) > 18):
    return "0"

  for i in range(0, len(dataList), 2):
    y_coord = dataList.pop()
    x_coord = dataList.pop()
    coord_list.append([x_coord,y_coord])

  coord_sub_list = coord_list[1:]

  perms = itertools.permutations(coord_sub_list)

  distances = []
  perms_list = []
  coords_obj_list = []

  for i in perms:
    perms_list.append(i)
    summa = calculate_distances(i)
    summa_2 = calculate_distances_to_first_node(i,coord_list)
    distances.append(summa+summa_2)
    coords_obj_list.append(Coords(i,summa+summa_2))

  coords_obj_list.sort()

  unique_list = list(set(coords_obj_list))
  unique_list.sort()

  min_path = []
  min_path_2 = []

  min_path = list(unique_list[0].route())
  min_path_length = unique_list[0].len()
  min_path.insert(0,coord_list[0])
  min_path.append(coord_list[0])

  if(len(unique_list) > 1):
    min_path_2 = list(unique_list[1].route())
    min_path_2_length = unique_list[1].len()
    min_path_2.insert(0,coord_list[0])
    min_path_2.append(coord_list[0])

  if(len(min_path_2) > 1):
    min_path += min_path_2
    min_path.insert(0,1) #array to be returned contains both shortest and 2nd shortest paths
  else:
    min_path.insert(0,0) #array to be returned contains only shortest path

  return json.dumps(min_path)

def calculate_distances(list_of_coords):
    sum = 0
    for x in range(1, len(list_of_coords)):
      sum += calculate_distance(list_of_coords[x-1],list_of_coords[x])
    return sum

def calculate_distance(lista1,lista2):
    delta_x = lista1[0] - lista2[0]
    delta_y = lista1[1] - lista2[1]
    return math.sqrt( math.pow(delta_x, 2) + math.pow(delta_y, 2))

def calculate_distances_to_first_node(route,coords):
    first_node = coords[0]
    route_head = route[0]
    route_tail = route[-1]
    from_first_node_to_head = calculate_distance(first_node,route_head)
    from_first_node_to_tail = calculate_distance(first_node,route_tail)
    sum = from_first_node_to_head + from_first_node_to_tail
    return sum

class WSHandler(tornado.websocket.WebSocketHandler):

  def check_origin(self, origin):
    return True

  def open(self):
    print('User is connected.')

  def on_message(self, message):
    obj = json.loads(message)
    self.write_message(permutate(obj))

  def on_close(self):
    print('Connection closed.')

#Uncomment following line if you are providing only the web socket interface and not serving static files with Tornado
application = tornado.web.Application([(r'/tsp', WSHandler),])

#Uncomment following line if you are providing both the web socket interface and static file serving with Tornado
#application = tornado.web.Application([(r'/tsp', WSHandler),(r"/content/(.*)", tornado.web.StaticFileHandler, {"path": "/var/www/visual-tsp"})])

if __name__ == "__main__":
  http_server = tornado.httpserver.HTTPServer(application)
  http_server.listen(9999)
  print('Server listening on port 9999')
  tornado.ioloop.IOLoop.instance().start()
