import React, { useState } from 'react';

const App = () => {
    const [text, setText] = useState('');

    const clearText = () => {
        setText(''); // Clears the text
    };

    return (
        <div>
            <h1>Hello, Electron with React! {text}</h1>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button onClick={clearText}>Clear Text</button>
        </div>
    );
};

export default App;
