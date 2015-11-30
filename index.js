var _ = require('lodash')
var interact = require('interact.js')
var transform = require('hexaworld/transform.js')
var tile = require('hexaworld/geo/tile.js')
var Mask = require('hexaworld/mask.js')
var World = require('hexaworld/world.js')
var Camera = require('hexaworld/camera.js')
var Player = require('hexaworld/player.js')
var Game = require('crtrdg-gameloop')
var Keyboard = require('crtrdg-keyboard')

var editor = document.getElementById('editor')

var game = new Game({
  canvas: 'game',
  width: editor.clientWidth,
  height: editor.clientHeight
})

var pathSet = [
  [], 
  [0], 
  [0,1,2,3,4,5],
  [0,1], [0, 2], [0, 3],
  [0,1,2], [0,2,4], [0,1,3], [0,1,4],
  [0,1,2,3], [0,1,2,4], [0,1,2,3,4]
]

var pathGroups = [2, 5, 9]
var iconSize = 100

var tileSet = pathSet.map( function(paths) {
  return tile({
    position: [0, 0],
    scale: iconSize / 2,
    paths: paths,
    thickness: 1
  })
})

var mask = new Mask({
  size: 1 * iconSize/2,
  position: [iconSize/2, iconSize/2],
  fill: 'rgb(90,90,90)',
  orientation: 'flat'
})

function makeIcons() {
  tileSet.forEach( function (tile, i) {
    var canvas = document.createElement('canvas')
    canvas.setAttribute('width', '100px')
    canvas.setAttribute('height', '100px')
    canvas.id = i
    canvas.className = 'tile-icon icon'
    document.getElementById('tileSet').appendChild(canvas)
    if (pathGroups.indexOf(i) > -1) {
      document.getElementById('tileSet').appendChild(document.createElement('hr'))
    }
  })
}

function drawIcons() {
  tileSet.forEach( function (tile, i) {
    var context = document.getElementById(i).getContext('2d')
    var camera = {transform: transform(), game: {width: iconSize, height: iconSize}}
    mask.set(context)
    tile.draw(context, camera)
    mask.unset(context)
  })
}

makeIcons()
drawIcons()

function getposition(event) {
  var x = event.pageX - game.width/2
  var y = event.pageY - game.width/2
  if (_.all([x > -game.width/2, x < game.width/2, y > -game.height/2, y < game.height/2])) {
    return camera.transform.apply([[x, y]])[0]
  }
}

_.forEach(document.getElementsByClassName('tile-icon'), function(icon) {
  icon.addEventListener('click', function (item) {
    var id = icon.id
    pathSet[id] = _.map(pathSet[id], function(i) {return (i + 1 > 5) ? 0 : (i + 1)})
    tileSet[id] = tile({
      position: [0, 0], 
      scale: 60, 
      paths: pathSet[id],
      thickness: 1
    })
    drawIcons()
  })
})

interact('.tile-icon').draggable({

  onmove: function (event) {
    console.log(event)
    var target = event.target
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy
    var translation = 'translate(' + x + 'px, ' + y + 'px)'
    target.style.webkitTransform = target.style.transform = translation
    target.setAttribute('data-x', x)
    target.setAttribute('data-y', y)
    world.tiles.forEach( function(tile) {
      tile.props.stroke = null
    })
    var position = getposition(event)
    if (position) {
      var location = world.locate(position)
      if (location > -1) {
        world.tiles[location].props.stroke = 'rgb(100, 200, 112)'
        world.tiles[location].props.thickness = 10
      }
      world.tiles = _.sortBy(world.tiles, function (tile, i) {
        return location == i
      })
    }
  },

  onend: function (event) {
    var target = event.target
    var position = getposition(event)
    if (position) {
      var location = world.locate(position)
      if (location > -1) world.tiles.splice(location, 1)
      var q = Math.round(position[0] * 2/3 / 50)
      var r = Math.round((-position[0] / 3 + Math.sqrt(3)/3 * position[1]) / 50)
      var t = tile({
        position: [q, r],
        scale: 50,
        paths: pathSet[target.id],
        thickness: 0.75
      })
      world.tiles.push(t)
    }
    target.style.webkitTransform = target.style.transform = 'translate(0px, 0px)'
    target.setAttribute('data-x', 0)
    target.setAttribute('data-y', 0)
  }
})

var camera = new Camera({
  scale: 0.7,
  speed: {position: .5, angle: .1, scale: .002},
  friction: 0.9,
})

var keyboard = new Keyboard(game)
var world = new World()
var init = [
  [0, 0], [0, 1], [0, -1], [0, -2], [0, 2],
  [1, 0], [1, -1], [1, -2], [1, 1],
  [-1, 1], [-1, 0], [-1, -1], [-1, 2],
  [-2, 1], [-2, 0], [-2, -1], [-2, 2], [-2, 3],
  [2, 0], [2, -1], [2, -2], [2, -3], [2, 1]
]

world.tiles = init.map(function (p) {
  return tile({
    position: p, 
    scale: 50,
    thickness: 0.75
  })
})

var player = new Player({
  scale: 2,
  speed: {position: 1, angle: 8},
  friction: 0.9,
  stroke: 'white',
  fill: 'rgb(75,75,75)',
  thickness: 0.5
});

camera.addTo(game)
world.addTo(game)
player.addTo(game)

camera.on('update', function(interval) {
  this.move(keyboard)
})

player.on('update', function(interval) {
  this.move(keyboard, world)
});

game.on('draw', function(context) {
  world.draw(context, camera)
  //player.draw(context, camera)
})