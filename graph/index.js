async function getDictionary() {
    console.log("Getting dict!")
    const response = await fetch("structured_dictionary.json");
    return response.json()
}

function buildStyle() {
    const styleSheet = [];
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
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
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

    for (const pos of Object.keys(posColors)) {
        nodesByWord[pos] = {
            data: {id: pos},
            classes: ['pos'],
        }
    }

    for (const word of Object.keys(data)) {
        const parts = data[word];
        if (parts.length == 1) {
            // This is only one part of speech.
            const part = parts[0];
            const pos = part.pos.slice(0, -1);

            nodesByWord[word] = {
                data: {id: word},
                classes: [pos],
            }

            if (part.defs.length == 1) {
                // There is also only one definition.
                const def = part.defs[0];

                for (let target of def.split(" ")) {
                    if (target.endsWith('.')) {
                        target = target.slice(0, -1);
                    }
                    edges.push({
                        data: {
                            id: `${word}-${target}`,
                            source: word,
                            target,
                          },
                    })
                }
            }
        } else {
            nodesByWord[word] = {
                data: {id: word},
            }
        }
    }

    // SAFETY CHECK
    // If any nonexistent nodes are referred to by edges, create them with a
    // distinctive error style.
    function addPlaceholderIfNeeded(name) {
        if (!(name in nodesByWord)) {
            nodesByWord[name] = {
                data: {id: name},
                classes: ['missing'],
            } 
        }
    }

    for(const edge of elements.edges) {
        addPlaceholderIfNeeded(edge.data.source);
        addPlaceholderIfNeeded(edge.data.target);
    }
    
    elements.nodes.push(...Object.values(nodesByWord));

    console.log(elements)
    var cy = cytoscape({
        container: document.getElementById('cy'), // container to render in
        elements,
        style,
        // layout: {
        //     name: 'breadthfirst',
        //     fit: true,
        //     directed: false,
        //     circle: true,
        // }
        layout: {
            name: 'fcose',
            animate: false,
            tile: false,
        }
    });
}

render();