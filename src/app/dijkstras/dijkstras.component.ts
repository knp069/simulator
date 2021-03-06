import {Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import * as p5 from 'p5';
import {Edge} from '../models/Edge';
import {Node} from '../models/Node';
import PriorityQueue from 'priorityqueue';

@Component({
  selector: 'app-dijkstras',
  templateUrl: './dijkstras.component.html',
  styleUrls: ['./dijkstras.component.css']
})
export class DijkstrasComponent implements OnInit {
  get endNode(): number {
    return this._endNode;
  }

  set endNode(value: number) {
    this._endNode = value;
  }
  get startNode(): number {
    return this._startNode;
  }

  set startNode(value) {
    this._startNode = value;
  }
  private canvas: p5;
  private edges: Map<number, Edge[]>;
  private path: Map<number, number>;
  public nodes: Node[];
  public gridSize: number;
  public gridWidth: number;
  // tslint:disable-next-line:variable-name
  private _startNode: number;
  // tslint:disable-next-line:variable-name
  private _endNode: number;
  private prev;

  backgroud = 200;
  gridColor = 255;
  pointColor = 'green';
  nonVisitedEdge = 'red';
  visitedEdge = 'yellow';

  @ViewChild('canvas') canvasHolder: ElementRef;

  constructor() {
    this.nodes = [];
    this.path = new Map<number, number>();
    this.edges = new Map<number, Edge[]>();
    this.gridWidth = 20;
    this.gridSize = 30;
    this.prev = {};
  }

  private drawGrid  = (s: any, size, width) =>  {
    console.log('grid size : ' + size + ' , grid width : ' + width   );
    s.stroke(this.gridColor);
    s.background(this.backgroud);
    let counter = 0;
    for ( let i = 0 ; counter <= size ; i += width) {
      s.strokeWeight(1);
      s.line(i, 0, i, width * size);
      counter += 1;
    }
    counter = 0;
    for (let i = 0; counter <= size; i += width) {
      s.strokeWeight(1);
      s.line(0, i, size * width, i);
      counter += 1;
    }
  }

  private drawPoints(s: any) {
    this.nodes.forEach( node => {
      s.stroke(this.pointColor);
      s.strokeWeight(10);
      s.point(node.x, node.y);
      s.stroke(0, 0, 0, 0);
      s.text(node.id, node.x - 10, node.y - 10);
    });
  }

  private drawEdges(s: any) {
    s.strokeWeight(5);
    let i = 0;
    while (i < this.nodes.length ) {
      const lst = this.edges.get(i);
      if ( lst != null && lst.length > 0) {
        lst.forEach( e => {
          s.stroke(this.nonVisitedEdge);
          this.line(e.start, e.end);
          s.stroke(0, 0, 0, 0);
          s.text(e.weight, (e.start.x + e.end.x) / 2, (e.start.y + e.end.y) / 2);
        });
      }
      i++;
    }
  }

  private line(startNode: Node, endNode: Node) {
    this.canvas.line(startNode.x, startNode.y, endNode.x, endNode.y);
  }

  private drawPath(prev: {}, source: Node, destination: Node) {
    let prevNode = prev[destination.id];
    let currNode = destination;
    while ( prevNode !== null) {
          this.canvas.stroke(this.visitedEdge);
          this.canvas.strokeWeight(5);
          this.canvas.line(currNode.x, currNode.y , prevNode.x, prevNode.y);
          currNode = prevNode;
          prevNode = prev[currNode.id];
    }
  }

  ngOnInit(): void {
    const sketch = s => {
      s.setup = () => {
        const canvas = s.createCanvas(this.canvasHolder.nativeElement.offsetWidth, this.canvasHolder.nativeElement.offsetHeight);
        canvas.parent('canvas');
        this.drawGrid(s, this.gridSize, this.gridWidth);
        this.drawEdges(s);
        this.drawPoints(s);
      };
      s.draw = () => {
      };

      s.mouseClicked = () => {

      };

    };
    this.canvas = new p5(sketch);
  }

  updateGridWidth(value) {
    this.gridWidth = Number(value);
    this.canvas.setup();
  }

  updateGridSize(value) {
    this.gridSize = Number(value);
    this.canvas.setup();
  }

  addEdge(input: string) {
    const vals = input.split(',');
    const start = Number(vals[0]);
    const end = Number(vals[1]);
    const weight = Number(vals[2]);
    console.log('clicked');
    const edge: Edge = new Edge(this.nodes[start], this.nodes[end], weight);
    const invertEdge: Edge = new Edge(this.nodes[end], this.nodes[start], weight);
    this.extracted(start, edge);
    this.extracted(end, invertEdge);
    this.canvas.setup();
  }

  addNode() {
    console.log('mouse clicked');
    const x = this.canvas.mouseX;
    const y = this.canvas.mouseY;
    console.log('x : ' + x + ' y : ' + y);
    const node = new Node(x, y, this.nodes.length);
    this.nodes.push(node);
    this.canvas.setup();
  }

  private extracted(start, edge: Edge) {
    let exists = false;
    if (this.edges.get(start) == null) {
      this.edges.set(start, [edge]);
      console.log('edge added');
    } else {
      this.edges.get(start).forEach(e => {
        if (edge.end.id === e.end.id) {
          exists = true;
        }
      });
      if (!exists) {
        this.edges.get(start).push(edge);
        console.log('edge added');
      } else {
        console.log('edge not added');
      }
    }
  }

  calculatePath() {
    const startNode = this.nodes[this._startNode];
    const endNode = this.nodes[this._endNode];
    this.dijkstraAlgorithm(startNode, endNode);
    this.drawPath(this.prev, startNode, endNode);
  }
  dijkstraAlgorithm(startNode, endNode) {
    const distances = {};
    this.path.clear();
    const comparator = (a: Node, b: Node) => (a.distanceFromStart < b.distanceFromStart ? 1 : 0);

    // Stores the reference to previous nodes
    const pq = []

    // Set distances to all nodes to be infinite except startNode
    distances[startNode.id] = 0;
    pq.push(startNode);
    this.nodes.forEach(node => {
      if (node !== startNode) { distances[node.id] = Infinity; }
      this.prev[this.nodes.indexOf(node)] = null;
    });
    while (pq.length > 0) {
      const minNode = pq.pop();
      const currNode = minNode;
      const weight = minNode.distanceFromStart;
      const outGoingEdges = this.edges.get(currNode.id);
      if (outGoingEdges != null && outGoingEdges.length > 0) {
      outGoingEdges.forEach(edge => {
          const alt = distances[currNode.id] + edge.weight;
          if (alt < distances[edge.end.id]) {
            distances[edge.end.id] = alt;
            edge.end.distanceFromStart = alt;
            this.prev[edge.end.id] = currNode;
            pq.push(edge.end);
          }
      });
      }
      const minEdgeIndex = this.getMinIndex(pq)
      const tmp = pq[minEdgeIndex];
      pq[minEdgeIndex] = pq[pq.length - 1]
      pq[pq.length - 1] = tmp ;
    }
    console.log(distances);
    console.log(this.prev);
    return distances;
  }

  public setSoucreAndDestiNation(source, destination ) {
    if (source !== null) {
      this._startNode = Number(source);
    }
    if (destination !== null) {
      this._endNode = Number(destination);
    }
  }

  private getMinIndex(vierticesQueue: any[]) {
    let minIndex = -1;
    let min = Infinity;

    vierticesQueue.forEach( v => {
      if (v.distanceFromStart < min) {
        min = v.distanceFromStart;
        minIndex = vierticesQueue.indexOf(v);
      }
    });

    return minIndex;
  }

  testDijkstra() {
    this.nodes.push(new Node(50, 200, 0));
    this.nodes.push(new Node(150, 100, 1));
    this.nodes.push(new Node(250, 100, 2));
    this.nodes.push(new Node(350, 100, 3));
    this.nodes.push(new Node(450, 200, 4));
    this.nodes.push(new Node(350, 300, 5));
    this.nodes.push(new Node(250, 300, 6));
    this.nodes.push(new Node(150, 300, 7));
    this.nodes.push(new Node(250, 200, 8));

    this.addEdge('0,1,4');
    this.addEdge('1,2,8');
    this.addEdge('2,3,7');
    this.addEdge('3,4,9');
    this.addEdge('4,5,10');
    this.addEdge('5,6,2');
    this.addEdge('6,7,1');
    this.addEdge('7,0,8');
    this.addEdge('7,8,7');
    this.addEdge('7,1,11');
    this.addEdge('2,8,2');
    this.addEdge('6,8,6');
    this.addEdge('2,5,4');
    this.addEdge('5,3,14');

    this.canvas.setup();
  }

}
