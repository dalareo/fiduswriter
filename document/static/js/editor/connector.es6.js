/* Functions for ProseMirror integration.*/

var theEditor = {};

function makeEditor (where, doc, version) {
  return new pm.ProseMirror({
    place: where,
    schema: fidusSchema,
    doc: doc,
    menuBar: true,
    collab: {version: version}
  })
};


theEditor.createDoc = function (aDocument) {
    var editorNode = document.createElement('div'),
      titleNode = aDocument.metadata.title ? exporter.obj2Node(aDocument.metadata.title) : document.createElement('div'),
      metadataNode = document.createElement('div'),
      documentContentsNode = exporter.obj2Node(aDocument.contents),
      metadataSubtitleNode = aDocument.metadata.subtitle ? exporter.obj2Node(aDocument.metadata.subtitle) : document.createElement('div'),
      metadataAuthorsNode = aDocument.metadata.authors ? exporter.obj2Node(aDocument.metadata.authors) : document.createElement('div'),
      metadataAbstractNode = aDocument.metadata.abstract ? exporter.obj2Node(aDocument.metadata.abstract) : document.createElement('div'),
      metadataKeywordsNode = aDocument.metadata.keywords ? exporter.obj2Node(aDocument.metadata.keywords) : document.createElement('div'),
      doc;

      titleNode.id = 'document-title';
      metadataNode.id = 'document-metadata';
      metadataSubtitleNode.id = 'metadata-subtitle';
      metadataAuthorsNode.id = 'metadata-authors';
      metadataAbstractNode.id = 'metadata-abstract';
      metadataKeywordsNode.id = 'metadata-keywords';
      documentContentsNode.id = 'document-contents';

      editorNode.appendChild(titleNode);
      metadataNode.appendChild(metadataSubtitleNode);
      metadataNode.appendChild(metadataAuthorsNode);
      metadataNode.appendChild(metadataAbstractNode);
      metadataNode.appendChild(metadataKeywordsNode);
      editorNode.appendChild(metadataNode);
      editorNode.appendChild(documentContentsNode);

      doc = pm.fromDOM(fidusSchema, editorNode)

      return doc;
};

theEditor.initiate = function () {
      let doc = theEditor.createDoc(theDocument);
      theEditor.editor = makeEditor(document.getElementById('document-editable'), doc, theDocument.version);
      theDocument.hash = theEditor.getHash();
      new UpdateUI(theEditor.editor, "selectionChange change activeMarkChange");
      theEditor.editor.on('change', editorHelpers.documentHasChanged);
      theEditor.editor.mod.collab.on('mustSend', theEditor.sendToCollaborators);
};

theEditor.update = function () {
      let doc = theEditor.createDoc(theDocument);
      theEditor.editor.setOption("collab", null)
      theEditor.editor.setContent(doc);
      theEditor.editor.setOption("collab", {version: theDocument.version})
      theEditor.editor.mod.collab.on('mustSend', theEditor.sendToCollaborators);
      theDocument.hash = theEditor.getHash();
};

theEditor.getUpdates = function (callback) {
      var outputNode = pm.serializeTo(theEditor.editor.mod.collab.versionDoc,'dom');
      theDocument.title = theEditor.editor.doc.firstChild.textContent;
      theDocument.version = theEditor.editor.mod.collab.version;
      theDocument.metadata.title = exporter.node2Obj(outputNode.getElementById('document-title'));
      theDocument.metadata.subtitle = exporter.node2Obj(outputNode.getElementById('metadata-subtitle'));
      theDocument.metadata.authors = exporter.node2Obj(outputNode.getElementById('metadata-authors'));
      theDocument.metadata.abstract = exporter.node2Obj(outputNode.getElementById('metadata-abstract'));
      theDocument.metadata.keywords = exporter.node2Obj(outputNode.getElementById('metadata-keywords'));
      theDocument.contents = exporter.node2Obj(outputNode.getElementById('document-contents'));
      theDocument.hash = theEditor.getHash();
      if (callback) {
          callback();
      }
};

theEditor.unconfirmedSteps = {};

var confirmStepsRequestCounter = 0;

theEditor.sendToCollaborators = function () {
      console.log('send to collabs')
      let toSend = theEditor.editor.mod.collab.sendableSteps()
      let request_id = confirmStepsRequestCounter++
      let aPackage = {
          type: 'diff',
          version: theEditor.editor.mod.collab.version,
          diff: toSend.steps.map(s => s.toJSON()),
          request_id: request_id
      }
      serverCommunications.send(aPackage)
      theEditor.unconfirmedSteps[request_id] = toSend
};

theEditor.confirmDiff = function (request_id) {
    console.log('confirming steps')
    let sentSteps = theEditor.unconfirmedSteps[request_id]
    theEditor.editor.mod.collab.confirmSteps(sentSteps)
};

theEditor.applyDiffs = function(diffs) {
    theEditor.editor.mod.collab.receive(diffs.map(j => pm.Step.fromJSON(fidusSchema, j)));
}


theEditor.startCollaborativeMode = function () {
    theDocumentValues.collaborativeMode = true;
};

theEditor.stopCollaborativeMode = function () {
    theDocumentValues.collaborativeMode = false;
};

theEditor.getHash = function () {
    let string = JSON.stringify(theEditor.editor.mod.collab.versionDoc)
    let len = string.length
    var hash = 0, char, i;
    if (len == 0) return hash;
    for (i = 0; i < len; i++) {
        char = string.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash;
    }
    return hash;
};
theEditor.checkHash = function(version, hash) {
    console.log('Verifying hash')
    if (version===theEditor.editor.mod.collab.version) {
      if(hash===theEditor.getHash()) {
          console.log('Hash could be verified');
          return;
      }
      console.log('Hash could not be verified, requesting document.');
      serverCommunications.send({type: 'get_document_update'});
      return;
    } else {
      serverCommunications.send({
        type: 'check_version',
        version: theEditor.editor.mod.collab.version
      });
      return;
    }
}
theEditor.fromDOM = pm.fromDOM;
theEditor.schema = fidusSchema;

window.theEditor = theEditor;
