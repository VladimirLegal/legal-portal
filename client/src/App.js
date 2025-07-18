// client/src/App.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/test')
      .then(response => setMessage(response.data.message))
      .catch(error => console.error(error));
  }, []);

  return (
    <div>
      <h1>Юридический портал</h1>
      <p>Ответ сервера: {message}</p>
    </div>
  );
}

export default App;