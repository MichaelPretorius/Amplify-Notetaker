import React, { useState, useEffect } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';

import { createNote, deleteNote,  updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions';

const App = ({ authData }) => {
  const [id, setId] = useState('');
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    getNotes();
    const createNoteListener = API.graphql(graphqlOperation(onCreateNote, { owner: authData.username })).subscribe({
      next: res => {
        const newNote = res.value.data.onCreateNote;
        setNotes(prevNotes => {
          const oldNotes = prevNotes.filter(note => note.id !== newNote.id);
          return [...oldNotes, newNote];
        });
        setNote('');
      }
    })

    const deleteNoteListener = API.graphql(graphqlOperation(onDeleteNote, { owner: authData.username })).subscribe({
      next: res => {
        const deletedNote = res.value.data.onDeleteNote;
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.filter(note => deletedNote.id !== note.id)
          return updatedNotes;
        });
      }
    })

    const updateNoteListener = API.graphql(graphqlOperation(onUpdateNote, { owner: authData.username })).subscribe({
      next: res => {
        const updatedNote = res.value.data.onUpdateNote;
        setNotes(prevNotes => {
          const index = prevNotes.findIndex(note => updatedNote.id === note.id)
          return [...prevNotes.slice(0, index), updatedNote, ...prevNotes.slice(index + 1)];
        })
        setNote('');
        setId('');
      }
    })

    return () => {
      createNoteListener.unsubscribe();
      deleteNoteListener.unsubscribe();
      updateNoteListener.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getNotes = async () => {
    const res = await API.graphql(graphqlOperation(listNotes));
    setNotes(res.data.listNotes.items);
  }

  const handleChangeNote = e => setNote(e.target.value);

  const handleSetNote = ({ note, id}) => {
    setNote(note)
    setId(id)
  };

  const handleDeleteNote = async id => {
    await API.graphql(graphqlOperation(deleteNote, { input: { id }}))
  }

  const handleUpdateNote = async () => {
    await API.graphql(graphqlOperation(updateNote, { input: { id, note }}))
  }

  const hasExistingNote = () => {
    if (id) {
      // is valid id?
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote
    }
    return false;
  }

  const handleAddNote = async e => {
    e.preventDefault();
    // check if existing note, then update if
    if (hasExistingNote()) {
      handleUpdateNote();
    } else {
      await API.graphql(graphqlOperation(createNote, { input: { note }}))
    }
  }

  return (
    <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
      <h1 className="code f2-1">Amplify Notetaker</h1>

      {/* Note Form */}
      <form onSubmit={handleAddNote} className="mb3">
        <input className="pa2 f4" type="text" placeholder="Write your note" onChange={handleChangeNote} value={note} />
        <button className="pa2 f4" type="submit">
          {id ? 'Update Note' : 'Add Note'}
        </button>
      </form>

      {/* Notes List */}
      <div>
        {notes.map(note => (
          <div key={note.id} className="flex items-center">
            <li className="list pa1 f3" onClick={() => handleSetNote(note)}>
              {note.note}
            </li>
            <button className="bg-transparent bn f4" onClick={() => handleDeleteNote(note.id)}>
              <span>&times;</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
