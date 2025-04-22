async function getDictionary() {
    console.log("Getting dict!")
    const response = await fetch("structured_dictionary.json");
    return response.json()
}

function sortByPartOfSpeech(a, b) {
    const aPos = a.data.pos || a.data('pos');
    const bPos = b.data.pos || a.data('pos');
    return aPos.localeCompare(bPos);
}

function sortByOutDegree(a, b) {
    const aDegree = a.outdegree();
    const bDegree = b.outdegree();
    return bDegree - aDegree;
}

function sortByInDegree(a, b) {
    const aDegree = a.indegree();
    const bDegree = b.indegree();
    return bDegree - aDegree;
}

function buildStyle() {
    const styleSheet = [];
    styleSheet.push({
        selector: '*:selected',
        style: {
            'underlay-color': 'aqua',
            'underlay-padding': 15,
            'underlay-opacity': 0.5,
            'underlay-shape': 'ellipse'
        }
    })
    styleSheet.push({
        selector: 'node',
        style: {
            'background-color': '#666',
            'label': 'data(id)'
        }
    });
    styleSheet.push({
        selector: 'edge',
        style: {
            'width': 3,
            'line-color': '#000',
            'line-opacity': '0.2',
            'target-arrow-color': '#000',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        }
    })

    posColors = {
        k: '#8e44ad',
        sj: 'blue',
        q: 'tan',
        a: 'green',
        e: 'green',
        hh: 'green',
        r: 'purple',
        p: 'blue',
        bu: 'tan',
        i: 'blue',
        cj: 'orange',
        y: 'orange'
    }

    for (const pos of Object.keys(posColors)) {
        styleSheet.push({
            selector: `node.${pos}`,
            style: {
                'background-color': posColors[pos]
            }
        })
    }

    styleSheet.push({
        selector: `node.missing`,
        style: {
            'background-color': 'red'
        }
    })

    styleSheet.push({
        selector: `node.pos`,
        style: {
            'background-color': '#abb2b9'
        }
    })

    styleSheet.push({
        selector: `node.cluster-0`,
        style: {
            'underlay-color': 'green',
            'underlay-padding': 10,
            'underlay-opacity': 1
        }
    })
    styleSheet.push({
        selector: `node.cluster-1`,
        style: {
            'underlay-color': 'yellow',
            'underlay-padding': 10,
            'underlay-opacity': 1
        }
    })
    styleSheet.push({
        selector: `node.cluster-2`,
        style: {
            'underlay-color': 'red',
            'underlay-padding': 10,
            'underlay-opacity': 1
        }
    })

    console.log(styleSheet);
    return styleSheet
}

const style = buildStyle();

async function render() {
    const data = await getDictionary();

    const elements = {
        nodes: [],
        edges: [],
    };

    const nodesByWord = {};
    const edges = elements.edges;

    function addNode(word, pos) {
        nodesByWord[word] = {
            data: {
                id: word,
                pos: pos
            },
            classes: [pos],
        }
    }

    for (const pos of Object.keys(posColors)) {
        addNode(pos, 'pos');
    }

    function addEdgesToWords(source, def) {
        for (let target of def.split(" ")) {
            if (target.endsWith('.')) {
                target = target.slice(0, -1);
            }
            edges.push({
                data: {
                    id: `${source}-${target}`,
                    source,
                    target,
                  },
            })
        }
    }

    for (const word of Object.keys(data)) {
        const parts = data[word];
        if (parts.length == 1) {
            // This is only one part of speech.
            const part = parts[0];
            const pos = part.pos.slice(0, -1);

            addNode(word, pos);

            if (part.defs.length == 1) {
                // There is also only one definition.
                addEdgesToWords(word, part.defs[0]);
            } else {
                // There are multiple definitions. For now, just slam them together.
                for (const def of part.defs) {
                    addEdgesToWords(word, def);
                }
            }
        } else {
            addNode(word, 'multiple');
            // There are multiple parts of speech. For now, just slam themn together.
            for (const part of parts) {
                if (part.defs.length == 1) {
                    // There is also only one definition.
                    addEdgesToWords(word, part.defs[0]);
                } else {
                    // There are multiple definitions. For now, just slam them together.
                    for (const def of part.defs) {
                        addEdgesToWords(word, def);
                    }
                }
            }
        }
    }

    // SAFETY CHECK
    // If any nonexistent nodes are referred to by edges, create them with a
    // distinctive error style.
    function addPlaceholderIfNeeded(name) {
        if (!(name in nodesByWord)) {
            addNode(word, 'missing');
        }
    }

    for(const edge of elements.edges) {
        addPlaceholderIfNeeded(edge.data.source);
        addPlaceholderIfNeeded(edge.data.target);
    }
    
    elements.nodes.push(...Object.values(nodesByWord));

    elements.nodes.sort(sortByPartOfSpeech);

    console.log(elements)
    var cy = cytoscape({
        container: document.getElementById('cy'), // container to render in
        elements,
        style,
        layout: {
            name: 'grid',
            avoidOverlapPadding: 50,
            nodeDimensionsIncludeLabels: true,
            sort: (a, b) => a.indegree() - b.indegree()
        }
        // layout: {
        //     name: 'breadthfirst',
        //     fit: true,
        //     directed: false,
        //     circle: true,
        // }
        // layout: {
        //     name: 'concentric',
        //     concentric: node => Math.abs(node.outdegree(false) - node.indegree(false)),
        //     uniformNodeDimensions: true,
        // }
        // layout: {
        //     name: 'circle',
        //     nodeDimensionsIncludeLabels: true,
        //     // sort: sortByPartOfSpeech
        // }
        // layout: {
        //     name: 'cose',
        //     nodeDimensionsIncludeLabels: true,
        //     nodeOverlap: 10
        // }
        // layout: {
        //     name: 'fcose',
        //     animate: false,
        //     tile: false,
        //     uniformNodeDimensions: true,
        //     nodeRepulsion: node => node.totalDegree(false) * 1000,
        // }
    });

    let locked = cy.collection();

    cy.on('oneclick', 'node', (event) => {
        const node = event.target;
        node.outgoers('edge').select();
        console.log(node.data(), node.indegree(), node.outdegree(), node.classes());
    });
    cy.on('dblclick', 'node', (event) => {
        const node = event.target;

        const descendants = node.outgoers('node').difference(locked);
        const predecessors = node.incomers('node').difference(locked);
        const peers = descendants.intersection(predecessors).union(node);
        const neighbors = node.neighborhood('node').difference(locked);
        // Move this node to the center of the screen.
        peers.layout({
            name: 'circle',
            boundingBox: cy.extent(),
            radius: 10,
        }).run(); 
        descendants.difference(peers).layout({
            name: 'circle',
            boundingBox: cy.extent(),
            startAngle: Math.PI * 0.9,
            sweep: Math.PI * 0.8,
            clockwise: false,
            radius: 100,
        }).run();
        predecessors.difference(peers).layout({
            name: 'circle',
            boundingBox: cy.extent(),
            startAngle: Math.PI * 1.1,
            sweep: Math.PI * 0.8,
            clockwise: true,
            radius: 100,
        }).run();
        
    });

    function pinHighIndegree() {
        // Lay out the high-indegree terms near the center, then lock them.
        const highIndegree = cy.nodes('[[indegree > 100]]');
        highIndegree.layout({
            name: 'circle'
        }).run()
        highIndegree.lock();
        locked = locked.union(highIndegree);
    }

    // Lay out a massive circle to establish how much space we need.
    cy.nodes().difference(locked).layout({
        name: 'circle'
    }).run()

    const nextBox = (box) => ({...box, y1: box.y2+300, y2: box.y2 + 400});
    const prevBox = (box) => ({...box, y1: box.y1-400, y2: box.y1 - 300});

    const extent = cy.extent();
    const topBox = {...extent, height: 100, y2: extent.y1+100}
    const bottomBox = {...extent, height: 100, y1: extent.y2-100}

    function pinRoots() {
        let rooted = cy.collection();
        // Find the roots - the nodes that have no indegree.
        const roots = cy.nodes().roots().sort(sortByOutDegree);
        roots.layout({
            name: 'grid',
            boundingBox: topBox,
            rows: 1,
            condense: true,
            nodeDimensionsIncludeLabels: true,
        }).run();
        console.log('Root layer size: ', roots.length);
        roots.lock();
        locked = locked.union(roots);
        rooted = rooted.union(roots);

        // Go layer by layer adding rows until we can't.
        let r = roots;
        let box = topBox;
        do {
            r = r.outgoers('node')
                .filter(node => node.incomers('node').difference(rooted).length == 0)
                .sort(sortByInDegree)
            box = nextBox(box);
            r.layout({
                name: 'grid',
                boundingBox: box,
                rows: 1,
                condense: true,
                nodeDimensionsIncludeLabels: true,
            }).run();
            console.log('Semiroot layer size: ', r.length);
            r.lock();
            locked = locked.union(r);
            rooted = rooted.union(r);
        } while (r.length > 0);
    }

    function pinLeaves() {
        let allLeaves = cy.collection();
        const leaves = cy.nodes().leaves();
        leaves.layout({
            name: 'grid',
            boundingBox: bottomBox,
            rows: 1,
            condense: true,
            nodeDimensionsIncludeLabels: true,
        }).run();
        leaves.lock();
        locked = locked.union(leaves);
        allLeaves = allLeaves.union(leaves);

        // Go layer by layer adding rows until we can't.
        let l = leaves;
        box = bottomBox;
        do {
            l = l.incomers('node')
                .filter(node => node.outgoers('node').difference(allLeaves).length == 0)
            box = prevBox(box);
            l.layout({
                name: 'grid',
                boundingBox: box,
                rows: 1,
                condense: true,
                nodeDimensionsIncludeLabels: true,
            }).run();
            l.lock();
            locked = locked.union(l);
            allLeaves = allLeaves.union(l);
        } while (l.length > 0);
    }

    pinLeaves();
    pinRoots();
    pinHighIndegree();

    cy.nodes().difference(locked).layout({
        name: 'circle',
        fit: false,
    }).run()

    // cy.nodes().layout({
    //     name: 'fcose',
    //     animate: true,
    // }).run()

    cy.fit();


    console.log("extent", extent)

    const indegrees = {};
    const outdegrees = {};

    for (const node of cy.nodes()) {
        indegrees[node.indegree()] = (indegrees[node.indegree()] || 0) + 1
        outdegrees[node.outdegree()] = (outdegrees[node.outdegree()] || 0) + 1
    }
    console.log(indegrees);
    console.log(outdegrees);

    function markClusters(inflateFactor = 2.0) {
        const clusters = cy.elements().markovClustering({
            inflateFactor,
        });
        
        let clusterId = 0
        for (const cluster of clusters) {
            cluster.addClass(`cluster-${clusterId++}`)
        }
        console.log("Cluster count:", clusters.length)
    }
    // markClusters(1.8);

    function findStronglyConnectedComponents() {
        const tsc = cy.elements().tarjanStronglyConnected();
        const interestingComponents = tsc.components.filter(c => c.length > 1);
        console.log("tsc", interestingComponents)
        let clusterId = 0
        for (const cluster of interestingComponents) {
            cluster.addClass(`cluster-${clusterId++}`)
            console.log("cluster ", clusterId, "nodes", cluster.nodes().length)
        }
    }
    findStronglyConnectedComponents();

    console.log("cy", cy)
}

render();