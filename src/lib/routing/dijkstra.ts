export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  baseWeight: number; // distance or base time
  trafficMultiplier: number; // 1.0 = normal, 2.0 = heavy traffic
}

export class DijkstraRouter {
  nodes: Map<string, GraphNode> = new Map();
  edges: Map<string, GraphEdge[]> = new Map();

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
  }

  addEdge(edge: GraphEdge) {
    this.edges.get(edge.from)?.push(edge);
    // Assuming undirected for simplicity, though real roads are directed
    this.edges.get(edge.to)?.push({
      from: edge.to,
      to: edge.from,
      baseWeight: edge.baseWeight,
      trafficMultiplier: edge.trafficMultiplier
    });
  }

  findShortestPath(startId: string, endId: string): { path: string[], cost: number } {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    for (const id of this.nodes.keys()) {
      distances.set(id, Infinity);
      previous.set(id, null);
      unvisited.add(id);
    }
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let currentId: string | null = null;
      let minDistance = Infinity;
      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < minDistance) {
          minDistance = d;
          currentId = id;
        }
      }

      if (currentId === null || currentId === endId) {
        break; // Reached destination or stuck
      }

      unvisited.delete(currentId);

      const neighbors = this.edges.get(currentId) || [];
      for (const edge of neighbors) {
        if (!unvisited.has(edge.to)) continue;

        // Apply traffic weight dynamically
        const weight = edge.baseWeight * edge.trafficMultiplier;
        const alt = distances.get(currentId)! + weight;

        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, currentId);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let curr: string | null = endId;
    
    if (previous.get(curr) !== null || curr === startId) {
      while (curr !== null) {
        path.unshift(curr);
        curr = previous.get(curr)!;
      }
    }

    return {
      path,
      cost: distances.get(endId) || Infinity
    };
  }
}
