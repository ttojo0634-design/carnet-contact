import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('Tous');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  // États du formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [typeGroupe, setTypeGroupe] = useState('amis');

  // 1. Fonction pour récupérer les contacts (Nettoyée et isolée)
  const fetchContacts = async () => {
    try {
      // On encode proprement les paramètres pour éviter les problèmes d'espaces dans la recherche
      const url = `http://localhost:5000/api/contacts?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setContacts(data); // Met à jour la liste ET le compteur (.length) instantanément
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error("Impossible de joindre le serveur :", error);
      setContacts([]);
    }
  };

  // 2. Déclencheur automatique : Relance la recherche CHAQUE fois que 'search' ou 'type' change
  useEffect(() => {
    fetchContacts();
  }, [search, type]); 

  // 3. Soumission du formulaire d'ajout
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim()) {
      alert('Le nom et le téléphone sont obligatoires !');
      return;
    }

    // Préparation de l'objet à envoyer
    const nouveauContactForm = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      adresse_email: email.trim(),
      type_groupe: typeGroupe,
      num: telephone.trim()
    };

    try {
      const response = await fetch('http://localhost:5000/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nouveauContactForm),
      });

      if (response.ok) {
        // 1. On vide immédiatement les champs du formulaire
        setNom('');
        setPrenom('');
        setEmail('');
        setTelephone('');
        
        // 2. ✨ MISE À JOUR EN TEMPS RÉEL : On ajoute le nouveau contact directement 
        // dans le tableau local. React va recalculer instantanément le .length !
        setContacts((prevContacts) => {
          // On recrée l'objet tel que le SELECT du backend l'attend pour l'affichage
          const contactAjoute = {
            id: Date.now(), // ID temporaire en attendant le prochain rechargement
            nom: nouveauContactForm.nom,
            prenom: nouveauContactForm.prenom,
            adresse_email: nouveauContactForm.adresse_email,
            type_groupe: nouveauContactForm.type_groupe,
            num: nouveauContactForm.num
          };
          
          // On ajoute le contact à la liste existante et on trie par nom alphabétique
          const nouvelleListe = [...prevContacts, contactAjoute];
          return nouvelleListe.sort((a, b) => a.nom.localeCompare(b.nom));
        });

        // 3. On lance un fetch en arrière-plan pour synchroniser les vrais ID de la base de données
        fetchContacts();

      } else {
        const errorData = await response.json();
        alert(`Erreur lors de l'ajout : ${errorData.error}`);
      }
    } catch (error) {
      console.error("Erreur de connexion lors de l'ajout :", error);
    }
  };

  // Fonction pour supprimer un contact
  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce contact ?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/contacts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // ✨ MISE À JOUR EN TEMPS RÉEL DU COMPTEUR : 
        // On retire immédiatement le contact du tableau local pour que le compteur baisse de 1
        setContacts((prevContacts) => prevContacts.filter(contact => contact.id !== id));
        
        // On synchronise en arrière-plan avec la base de données
        fetchContacts();
      } else {
        alert("Erreur lors de la suppression du contact.");
      }
    } catch (error) {
      console.error("Erreur de connexion lors de la suppression :", error);
    }
  };

  // Le reste du code (le return) reste exactement le même qu'avant...

  return (
    <div className={`app-wrapper ${darkMode ? 'dark-mode' : ''}`}>
      
      {/* 🌙 BOUTON DARK MODE */}
      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="btn-dark-mode"
          style={{
            padding: '10px 15px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: darkMode ? '#f1c40f' : '#34495e',
            color: darkMode ? '#2c3e50' : 'white',
            fontWeight: 'bold'
          }}
        >
          {darkMode ? '☀️ Mode Clair' : '🌙 Mode Nuit'}
        </button>
    </div>
    <div className="container">
      <h1>📇 Carnet de Contacts</h1>

      {/* Recherche et Filtres */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Rechercher par nom ou prénom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Tous">Tous les groupes</option>
          <option value="famille">Famille</option>
          <option value="amis">Amis</option>
          <option value="travail">Travail</option>
        </select>
      </div>

      <div className="main-content">
        {/* Liste des contacts */}
        <div className="contacts-list">
          <h2>Mes Contacts ({contacts.length})</h2>
          {contacts.length === 0 ? (
            <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Aucun contact trouvé.</p>
          ) : (
            <ul>
              {contacts.map((contact, index) => (
                <li key={contact.id || index} className="contact-item" style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <div className="contact-info">
                    <strong>{contact.prenom} {contact.nom}</strong>
                    <span className="contact-phone">📞 {contact.num || 'Pas de numéro'}</span>
                    {contact.adresse_email && <small className="contact-email">✉️ {contact.adresse_email}</small>}
                    <span className={`badge ${contact.type_groupe}`} style={{ marginTop: '5px', display: 'inline-block' }}>
                      {contact.type_groupe}
                    </span>
                  </div>
      
                  {/* 🔴 LE BOUTON SUPPRIMER */}
                  <button 
                    onClick={() => handleDelete(contact.id)} 
                    style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulaire */}
        <div className="contact-form">
          <h2>Ajouter un contact</h2>
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} />
            <input type="text" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            <input type="text" placeholder="Téléphone *" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            <input type="email" placeholder="Adresse Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            
            <label>Groupe :</label>
            <select value={typeGroupe} onChange={(e) => setTypeGroupe(e.target.value)}>
              <option value="amis">Amis</option>
              <option value="famille">Famille</option>
              <option value="travail">Travail</option>
            </select>
            
            <button type="submit">Enregistrer</button>
          </form>
        </div>
      </div>
    </div>
  </div>
  );
}

export default App;