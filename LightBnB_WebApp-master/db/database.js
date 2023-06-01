const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
  SELECT *
  FROM users
  WHERE email = $1`;

  return pool
    .query(queryString, [email])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
  SELECT *
  FROM users
  WHERE id = $1`;

  return pool
    .query(queryString, [id])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const {name, email, password} = user;
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1,$2,$3)
  RETURNING *;`;

  return pool
    .query(queryString, [name, email, password])
    .then(result => result.rows[0])
    .catch(err => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT properties.*, reservations.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN reservations ON properties.id = reservations.property_id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id= $1 AND reservations.start_date > Now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY start_date
    LIMIT $2`;
  
    return pool
      .query(queryString, [guest_id, limit])
      .then(result => result.rows)
      .catch(err => {
        console.log(err.message);
      });
};


/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

// const getAllProperties = function (options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// };

// const getAllProperties = (options, limit = 10) => {
//   pool
//     .query(`SELECT * FROM properties LIMIT $1`, [limit])
//     .then((result) => {
//       console.log(result.rows);
//     })
//     .catch((err) => {
//       console.log(err.message);
//     });
// };

const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  // Use iLike for comparing letter cases in postgres
  if (options.city) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);

    queryParams.push(`%${options.city}%`);
    queryString += `city iLIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);

    queryParams.push(options.owner_id);
    queryString += `owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);

    queryParams.push(options.minimum_price_per_night * 100);

    queryString += `cost_per_night >= $${queryParams.length} `;
  }

  if (options.maximum_price_per_night) {
    !queryParams.length ? (queryString += `WHERE `) : (queryString += `AND`);
    queryParams.push(options.maximum_price_per_night * 100);

    queryString += `cost_per_night <= $${queryParams.length} `;
  }

  // 4
  queryString += `GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then(res => res.rows);
  
  // return pool
  //   .query(`SELECT * FROM properties LIMIT $1`, [limit])
  //   .then((result) => {
  //     console.log(result.rows);
  //     return result.rows;
  //   })
  //   .catch((err) => {
  //     console.log(err.message);
  //   });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
