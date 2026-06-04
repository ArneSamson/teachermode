// lib/mockData.js

// 1. We faken de ingelogde gebruiker. 
// Verander 'jaar_niveau' naar 1 of 6 om je routing te testen.
export const currentUser = {
  id: "user-123",
  naam: "Test Leerling",
  rol: "leerling",
  jaar_niveau: 5
};

// 2. We faken de opdrachten
export const opdrachtenDB = [
  {
    id: "html-01",
    module: "HTML & CSS",
    jaar_niveau: 5,
    titel: "Het Rode Vierkant",
    enkel_schooluren: false,
    start_code: "<style>\n\n</style>\n\n<div id='vierkant'></div>"
  },
  {
    id: "sql-01",
    module: "Databases",
    jaar_niveau: 6,
    titel: "Selecteer alle klanten",
    enkel_schooluren: true,
    start_code: "SELECT * FROM \n"
  }
];