// Heavily based on https://p5js.org/examples/hello-p5-flocking.html and https://users.monash.edu/~cema/courses/FIT3094/lecturePDFs/lecture4a_VectorsSteering.pdf

let flock = []
let flockSize = 200
let speedLimit = 3
let maximumSteeringForce = 0.05

let directionCheckbox, separateCheckbox, alignCheckbox, cohereCheckbox

class Flocker {
  /**
   * @param {Number} x the starting x coordinate
   * @param {Number} y the starting y coordinate
   */
  constructor (x, y) {
    this.velocity = p5.Vector.random2D()
    this.position = createVector(x, y)
    this.flockerSize = 15
  }

  /**
   *
   * @param {[Flocker]} flock
   * @param {number} radius
   * @returns
   */
  findNeighbors (flock, radius) {
    let position = this.position
    return flock.filter(function (flocker) {
      let distance = flocker.position.dist(position)
      return 0 < distance && distance < radius
    })
  }

  /**
   * Updates acceleration, velocity, and position based on the other members of the flock
   *
   * @param {[Flocker]} flock the entire flock, including this flocker.
   */
  updateMovement (flock) {
    let acceleration = createVector(0, 0)

    // The strength of the three steering vectors.
    let separationWeight = 2.5
    let alignmentWeight = 1.0
    let coherenceWeight = 1.0

    if (separateCheckbox.checked()) {
      // Flockers should give each other breathing room
      let separationVector = this.separate(flock)
      separationVector.mult(separationWeight)
      acceleration.add(separationVector)
    }

    if (alignCheckbox.checked()) {
      // Flockers should go in the same direction
      let alignmentVector = this.align(flock)
      alignmentVector.mult(alignmentWeight)
      acceleration.add(alignmentVector)
    }

    if (cohereCheckbox.checked()) {
      // Flockers should group together
      let coherenceVector = this.cohere(flock)
      coherenceVector.mult(coherenceWeight)
      acceleration.add(coherenceVector)
    }

    this.velocity.add(acceleration)
    this.boundVelocity()

    this.position.add(this.velocity)
    this.boundPosition()
  }

  boundVelocity () {
    this.velocity.limit(speedLimit)
  }

  boundPosition () {
    let flockerRadius = this.flockerSize / 2.0
    if (this.position.x < -flockerRadius) {
      // If we've gone off the left edge of the screen, start over on the right
      this.position.x += width + flockerRadius
    } else if (this.position.x > width + flockerRadius) {
      // If we've gone off the right edge of the screen, start over on the left
      this.position.x -= width + flockerRadius
    }

    if (this.position.y < -flockerRadius) {
      // If we've gone off the top edge of the screen, start over on the bottom
      this.position.y += height + flockerRadius
    } else if (this.position.y > height + flockerRadius) {
      // If we've gone off the bottom edge of the screen, start over on the top
      this.position.y -= height + flockerRadius
    }
  }

  /**
   * Creates an acceleration vector away from too-near flockers.
   *
   * @param {[Flocker]} flock
   *
   * @return {Vector} the separation vector
   */
  separate (flock) {
    let neighborDistance = 25
    let neighbors = this.findNeighbors(flock, neighborDistance)
    if (neighbors.length == 0) {
      return createVector(0, 0)
    }

    let position = this.position
    let averageDirectionAwayFromNeighbors = p5.Vector.div(
      neighbors.reduce(function (accumulator, neighbor) {
        let diff = p5.Vector.sub(position, neighbor.position)

        // Weight by distance
        diff.normalize()
        diff.div(position.dist(neighbor.position))

        accumulator.add(diff)
        return accumulator
      }, createVector(0, 0)),
      neighbors.length
    )

    if (averageDirectionAwayFromNeighbors.mag() <= 0) {
      return createVector(0, 0)
    }

    averageDirectionAwayFromNeighbors.normalize()
    averageDirectionAwayFromNeighbors.mult(speedLimit)

    let steeringVector = p5.Vector.sub(
      averageDirectionAwayFromNeighbors,
      this.velocity
    )
    steeringVector.limit(maximumSteeringForce)

    return steeringVector
  }

  /**
   * @param {[Flocker]} flock
   *
   * @return {Vector} the alignment vector
   */
  align (flock) {
    let neighborDistance = 50
    let neighbors = this.findNeighbors(flock, neighborDistance)
    if (neighbors.length == 0) {
      return createVector(0, 0)
    }

    let averageVelocity = p5.Vector.div(
      neighbors.reduce(function (accumulator, flocker) {
        accumulator.add(flocker.velocity)
        return accumulator
      }, createVector(0, 0)),
      neighbors.length
    )

    averageVelocity.normalize()
    averageVelocity.mult(speedLimit)

    let steeringVector = p5.Vector.sub(averageVelocity, this.velocity)
    steeringVector.limit(maximumSteeringForce)

    return steeringVector
  }

  /**
   * @param {[Flocker]} flock
   *
   * @return {Vector} a steering vector towards the center (i.e., average location) of neighboring flockers
   */
  cohere (flock) {
    let neighborDistance = 50
    let neighbors = this.findNeighbors(flock, neighborDistance)
    if (neighbors.length == 0) {
      return createVector(0, 0)
    }

    let averagePosition = p5.Vector.div(
      neighbors.reduce(function (accumulator, flocker) {
        accumulator.add(flocker.position)
        return accumulator
      }, createVector(0, 0)),
      neighbors.length
    )

    let target = p5.Vector.sub(averagePosition, this.position)
    target.normalize()
    target.mult(speedLimit)

    let steeringVector = p5.Vector.sub(target, this.velocity)
    steeringVector.limit(maximumSteeringForce)

    return steeringVector
  }

  /**
   * If showing direction: draws a triangle centered on this.position and pointed in the direction of this.velocity.
   * If not showing direction: draws a circle centered on this.position.
   */
  draw () {
    let x = this.position.x
    let y = this.position.y
    fill(255, 255, 255, 100)
    stroke(255, 255, 255, 100)

    if (directionCheckbox.checked()) {
      push()
      translate(x, y)
      rotate(this.velocity.heading() + Math.PI / 2.0)

      let topAngle = PI
      let bottomRightAngle = Math.PI / 6.0
      let bottomLeftAngle = Math.PI / -6.0

      let top = createVector(
        Math.sin(topAngle) * this.flockerSize,
        Math.cos(topAngle) * this.flockerSize
      )

      let bottomRight = createVector(
        Math.sin(bottomRightAngle) * this.flockerSize,
        Math.cos(bottomRightAngle) * this.flockerSize
      )

      let bottomLeft = createVector(
        Math.sin(bottomLeftAngle) * this.flockerSize,
        Math.cos(bottomLeftAngle) * this.flockerSize
      )

      triangle(
        bottomLeft.x,
        bottomLeft.y,
        top.x,
        top.y,
        bottomRight.x,
        bottomRight.y
      )

      pop()
    } else {
      ellipse(x, y, this.flockerSize, this.flockerSize)
    }
  }
}

function setup () {
  let canvasSize = 800
  createCanvas(canvasSize, canvasSize)

  for (var i = 0; i < flockSize; i++) {
    flock.push(new Flocker(random(canvasSize), random(canvasSize)))
  }

  directionCheckbox = createCheckbox('Show Direction', false)
  separateCheckbox = createCheckbox('Separate', true)
  alignCheckbox = createCheckbox('Align', true)
  cohereCheckbox = createCheckbox('Cohere', true)

  let resetButton = createButton('Reset')
  resetButton.mousePressed(this.reset)
}

function reset () {
  for (const flocker of flock) {
    flocker.position = createVector(random(width), random(height))
    flocker.velocity = p5.Vector.random2D()
  }
}

function draw () {
  background(50)

  for (const flocker of flock) {
    flocker.updateMovement(flock)
    flocker.draw()
  }
}
