require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Connexion à la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// --- 1. ROUTE POUR RÉCUPÉRER TOUS LES CONTACTS (AVEC RECHERCHE ET FILTRE) ---
app.get('/api/contacts', async (req, res) => {
  try {
    const { search, type } = req.query;

    let query = `
      SELECT c.id, c.nom, c.prenom, c.adress_email, c.type_groupe, n.num 
      FROM contact c
      LEFT JOIN numero n ON c.id = n.contact_id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // Gestion de la recherche par nom ou prénom
    if (search && search.trim() !== '') {
      query += ` AND (c.nom ILIKE $${paramIndex} OR c.prenom ILIKE $${paramIndex})`;
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Gestion du filtre par groupe
    if (type && type !== 'Tous' && type.trim() !== '') {
      query += ` AND c.type_groupe = $${paramIndex}`;
      values.push(type.trim().toLowerCase());
      paramIndex++;
    }

    query += ' ORDER BY c.nom ASC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur Backend SELECT :", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 2. ROUTE POUR AJOUTER UN CONTACT ---
app.post('/api/contacts', async (req, res) => {
  try {
    const { nom, prenom, adress_email, type_groupe, num } = req.body;

    if (!nom || !num) {
      return res.status(400).json({ error: "Le nom et le numéro sont obligatoires." });
    }

    // Sécurisation du type de groupe en minuscules pour correspondre à la bdd
    const groupe = type_groupe ? type_groupe.toLowerCase() : 'amis';

    // Insertion du contact
    const newContact = await pool.query(
      'INSERT INTO contact (nom, prenom, adress_email, type_groupe) VALUES($1, $2, $3, $4) RETURNING id',
      [nom, prenom, adress_email, groupe]
    );

    const contactId = newContact.rows[0].id;

    // Insertion du numéro associé
    await pool.query(
      'INSERT INTO numero (num, contact_id) VALUES($1, $2)',
      [num, contactId]
    );

    res.json({ success: true, message: 'Contact ajouté avec succès !' });
  } catch (err) {
    console.error("Erreur Backend INSERT :", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTE POUR SUPPRIMER UN CONTACT ---
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Supprime le contact (les numéros liés sauteront automatiquement grâce au CASCADE)
    const result = await pool.query('DELETE FROM contact WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Contact introuvable." });
    }

    res.json({ success: true, message: "Contact supprimé avec succès !" });
  } catch (err) {
    console.error("Erreur Backend DELETE :", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Le serveur tourne parfaitement sur le port ${PORT}`);
});