import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; // Assuming you have an App.css for styling

function App() {
    // ----- State Management -----

    // State for Universities
    const [universities, setUniversities] = useState([]);
    const [universityForm, setUniversityForm] = useState({
        InstitutionName: '',
        Quality: '',
        Research: '',
        Alumni: ''
    });
    const [editUniversityId, setEditUniversityId] = useState(null);

    // State for Favorites
    const [favorites, setFavorites] = useState([]);
    const [favoriteForm, setFavoriteForm] = useState({
        UserID: '',
        ChoiceID: ''
    });

    // State for Top 5 Universities
    const [weights, setWeights] = useState({
        quality_weight: 1,
        research_weight: 1,
        alumni_weight: 1
    });
    const [topUniversities, setTopUniversities] = useState([]);

    // State for Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // State for Recommendations
    const [recommendations, setRecommendations] = useState([]);

    // State for User Preferences Input
    const [userPreferences, setUserPreferences] = useState({
        quality: '',
        research: '',
        alumni: ''
    });

    // ----- Fetch Functions -----

    // Fetch all universities (READ operation)
    const fetchUniversities = () => {
        axios.get('http://localhost:3001/University')
            .then(response => {
                setUniversities(response.data);
            })
            .catch(error => {
                console.error('Error fetching universities:', error);
            });
    };

    // Fetch all favorites
    const fetchFavorites = () => {
        axios.get('http://localhost:3001/Favorites')
            .then(response => {
                setFavorites(response.data);
            })
            .catch(error => {
                console.error('Error fetching favorites:', error);
            });
    };

    // Fetch Top 5 Universities
    const fetchTopUniversities = () => {
        const { quality_weight, research_weight, alumni_weight } = weights;
        axios.get('http://localhost:3001/Top5Universities', {
            params: {
                quality_weight,
                research_weight,
                alumni_weight
            }
        })
            .then(response => {
                setTopUniversities(response.data);
            })
            .catch(error => {
                console.error('Error fetching top universities:', error);
            });
    };

    // Fetch Search Results
    const fetchSearchResults = () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        axios.get('http://localhost:3001/search', {
            params: { query: searchQuery }
        })
            .then(response => {
                setSearchResults(response.data);
            })
            .catch(error => {
                console.error('Error searching universities:', error);
                alert('Failed to search universities.');
            });
    };

    // Fetch Recommendations
    const fetchRecommendations = () => {
        const { quality, research, alumni } = userPreferences;

        // Input validation on the frontend
        if ([quality, research, alumni].some(val => val === '')) {
            alert('Please provide values for Quality, Research, and Alumni.');
            return;
        }

        axios.get('http://localhost:3001/recommendations', {
            params: { quality, research, alumni }
        })
            .then(response => {
                setRecommendations(response.data);
            })
            .catch(error => {
                console.error('Error fetching recommendations:', error);
                alert('Failed to fetch recommendations.');
            });
    };

    // ----- useEffect Hook -----
    useEffect(() => {
        fetchUniversities();
        fetchFavorites();
        fetchTopUniversities();
    }, []);

    // ----- Handlers for University Form -----
    const handleUniversityChange = (e) => {
        setUniversityForm({
            ...universityForm,
            [e.target.name]: e.target.value,
        });
    };

    const handleUniversitySubmit = (e) => {
        e.preventDefault();
        const { InstitutionName, Quality, Research, Alumni } = universityForm;

        if (editUniversityId) {
            // Update operation
            axios.put(`http://localhost:3001/University/${editUniversityId}`, {
                InstitutionName,
                Quality,
                Research,
                Alumni
            })
                .then(() => {
                    fetchUniversities();
                    setEditUniversityId(null);
                    setUniversityForm({ InstitutionName: '', Quality: '', Research: '', Alumni: '' });
                })
                .catch(error => {
                    console.error('Error updating university:', error);
                });
        } else {
            // Create operation
            axios.post('http://localhost:3001/University', {
                InstitutionName,
                Quality,
                Research,
                Alumni
            })
                .then(() => {
                    fetchUniversities();
                    setUniversityForm({ InstitutionName: '', Quality: '', Research: '', Alumni: '' });
                })
                .catch(error => {
                    console.error('Error adding university:', error);
                });
        }
    };

    const handleUniversityDelete = (id) => {
        axios.delete(`http://localhost:3001/University/${id}`)
            .then(() => {
                fetchUniversities();
            })
            .catch(error => {
                console.error('Error deleting university:', error);
            });
    };

    const handleUniversityEdit = (university) => {
        setEditUniversityId(university.id);
        setUniversityForm({
            InstitutionName: university.InstitutionName,
            Quality: university.Quality,
            Research: university.Research,
            Alumni: university.Alumni,
        });
    };

    // ----- Handlers for Favorites Form -----
    const handleFavoriteChange = (e) => {
        setFavoriteForm({
            ...favoriteForm,
            [e.target.name]: e.target.value,
        });
    };

    const handleFavoriteSubmit = (e) => {
        e.preventDefault();
        const { UserID, ChoiceID } = favoriteForm;

        if (!UserID || !ChoiceID) {
            alert('Please provide both UserID and ChoiceID.');
            return;
        }

        axios.post('http://localhost:3001/Favorites', { UserID, ChoiceID })
            .then(() => {
                fetchFavorites();          // Fetch updated favorites
                fetchTopUniversities();    // Fetch updated top universities
                fetchUniversities();       // Fetch updated universities with new PopularityScore
                setFavoriteForm({ UserID: '', ChoiceID: '' });
                alert('Favorite added or updated successfully.');
            })
            .catch(error => {
                console.error('Error adding/updating favorite:', error);
                alert('Failed to add or update favorite.');
            });
    };

    const handleFavoriteDelete = (id) => {
        axios.delete(`http://localhost:3001/Favorites/${id}`)
            .then(() => {
                fetchFavorites();
                fetchTopUniversities();
                fetchUniversities(); // Optional: Update universities if needed
            })
            .catch(error => {
                console.error('Error deleting favorite:', error);
            });
    };

    // ----- Handlers for Top Universities Form -----
    const handleWeightsChange = (e) => {
        setWeights({
            ...weights,
            [e.target.name]: e.target.value,
        });
    };

    const handleGetTopUniversities = (e) => {
        e.preventDefault();
        fetchTopUniversities();
    };

    // ----- Handlers for Search Form -----
    const handleSearchSubmit = (e) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            alert('Please enter a search query.');
            return;
        }

        fetchSearchResults();
    };

    // ----- Handlers for User Preferences Form -----
    const handleUserPreferencesChange = (e) => {
        setUserPreferences({
            ...userPreferences,
            [e.target.name]: e.target.value,
        });
    };

    const handleUserPreferencesSubmit = (e) => {
        e.preventDefault();
        fetchRecommendations();
    };

    // ----- Render Component -----
    return (
        <div className="app-container">
            <h1>Welcome to UniRanker</h1>

            {/* ----- University Management ----- */}
            <section className="university-section">
                <h2>{editUniversityId ? 'Edit University' : 'Add University'}</h2>
                <form onSubmit={handleUniversitySubmit}>
                    <input
                        type="text"
                        name="InstitutionName"
                        placeholder="Institution Name"
                        value={universityForm.InstitutionName}
                        onChange={handleUniversityChange}
                        required
                    />
                    <input
                        type="number"
                        name="Quality"
                        placeholder="Quality"
                        value={universityForm.Quality}
                        onChange={handleUniversityChange}
                        required
                        min="0"
                        max="10"
                    />
                    <input
                        type="number"
                        name="Research"
                        placeholder="Research"
                        value={universityForm.Research}
                        onChange={handleUniversityChange}
                        required
                        min="0"
                        max="10"
                    />
                    <input
                        type="number"
                        name="Alumni"
                        placeholder="Alumni"
                        value={universityForm.Alumni}
                        onChange={handleUniversityChange}
                        required
                        min="0"
                        max="10"
                    />
                    <button type="submit">{editUniversityId ? 'Update' : 'Add'}</button>
                    {editUniversityId && (
                        <button type="button" onClick={() => {
                            setEditUniversityId(null);
                            setUniversityForm({ InstitutionName: '', Quality: '', Research: '', Alumni: '' });
                        }}>
                            Cancel
                        </button>
                    )}
                </form>

                {/* University Table */}
                <h2>University Table</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Institution Name</th>
                            <th>Quality</th>
                            <th>Research</th>
                            <th>Alumni</th>
                            <th>Popularity Score</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {universities.map(university => (
                            <tr key={university.id}>
                                <td>{university.id}</td>
                                <td>{university.InstitutionName}</td>
                                <td>{university.Quality}</td>
                                <td>{university.Research}</td>
                                <td>{university.Alumni}</td>
                                <td>{university.PopularityScore}</td>
                                <td>
                                    <button onClick={() => handleUniversityEdit(university)}>Edit</button>
                                    <button onClick={() => handleUniversityDelete(university.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* ----- Favorites Management ----- */}
            <section className="favorites-section">
                <h2>Add or Update Favorite</h2>
                <form onSubmit={handleFavoriteSubmit}>
                    <input
                        type="number"
                        name="UserID"
                        placeholder="User ID"
                        value={favoriteForm.UserID}
                        onChange={handleFavoriteChange}
                        required
                        min="1"
                    />
                    <input
                        type="number"
                        name="ChoiceID"
                        placeholder="Choice ID"
                        value={favoriteForm.ChoiceID}
                        onChange={handleFavoriteChange}
                        required
                        min="1"
                    />
                    <button type="submit">Add/Update Favorite</button>
                </form>

                {/* Favorites Table */}
                <h2>Favorites (Top 10 Most Recent)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Favorite ID</th>
                            <th>Choice ID</th>
                            <th>User ID</th>
                            <th>Date</th>
                            <th>Institution Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {favorites.map(fav => (
                            <tr key={fav.FavoriteID}>
                                <td>{fav.FavoriteID}</td>
                                <td>{fav.ChoiceID}</td>
                                <td>{fav.UserID}</td>
                                <td>{new Date(fav.Date).toLocaleDateString()}</td> {/* Updated to remove time */}
                                <td>{fav.InstitutionName}</td>
                                <td>
                                    <button onClick={() => handleFavoriteDelete(fav.FavoriteID)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* ----- Top 5 Universities ----- */}
            <section className="top-universities-section">
                <h2>Get Top 5 Universities</h2>
                <form onSubmit={handleGetTopUniversities}>
                    <div>
                        <label>Quality Weight:</label>
                        <input
                            type="number"
                            name="quality_weight"
                            value={weights.quality_weight}
                            onChange={handleWeightsChange}
                            required
                            min="0"
                        />
                    </div>
                    <div>
                        <label>Research Weight:</label>
                        <input
                            type="number"
                            name="research_weight"
                            value={weights.research_weight}
                            onChange={handleWeightsChange}
                            required
                            min="0"
                        />
                    </div>
                    <div>
                        <label>Alumni Weight:</label>
                        <input
                            type="number"
                            name="alumni_weight"
                            value={weights.alumni_weight}
                            onChange={handleWeightsChange}
                            required
                            min="0"
                        />
                    </div>
                    <button type="submit">Get Top 5</button>
                </form>

                {/* Top 5 Universities Table */}
                <h2>Top 5 Universities</h2>
                {topUniversities.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Institution Name</th>
                                <th>Total Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topUniversities.map((uni, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{uni.InstitutionName}</td>
                                    <td>{uni.TotalScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No data available.</p>
                )}
            </section>

            {/* ----- University Search ----- */}
            <section className="search-section">
                <h2>Search Universities</h2>
                <form onSubmit={handleSearchSubmit}>
                    <input
                        type="text"
                        name="search"
                        placeholder="Enter university name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        required
                    />
                    <button type="submit">Search</button>
                </form>

                {/* Search Results Table */}
                <h3>Search Results</h3>
                {searchResults.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Institution Name</th>
                                <th>Quality</th>
                                <th>Research</th>
                                <th>Alumni</th>
                                <th>Popularity Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchResults.map((uni) => (
                                <tr key={uni.id}>
                                    <td>{uni.id}</td>
                                    <td>{uni.InstitutionName}</td>
                                    <td>{uni.Quality}</td>
                                    <td>{uni.Research}</td>
                                    <td>{uni.Alumni}</td>
                                    <td>{uni.PopularityScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No results found.</p>
                )}
            </section>

            {/* ----- Recommendations ----- */}
            <section className="recommendations-section">
                <h2>Get Personalized Recommendations</h2>
                <form onSubmit={handleUserPreferencesSubmit}>
                    <div>
                        <label>Quality:</label>
                        <input
                            type="number"
                            name="quality"
                            placeholder="Enter your preference for Quality (0-10)"
                            value={userPreferences.quality}
                            onChange={handleUserPreferencesChange}
                            required
                            min="0"
                            max="10"
                        />
                    </div>
                    <div>
                        <label>Research:</label>
                        <input
                            type="number"
                            name="research"
                            placeholder="Enter your preference for Research (0-10)"
                            value={userPreferences.research}
                            onChange={handleUserPreferencesChange}
                            required
                            min="0"
                            max="10"
                        />
                    </div>
                    <div>
                        <label>Alumni:</label>
                        <input
                            type="number"
                            name="alumni"
                            placeholder="Enter your preference for Alumni (0-10)"
                            value={userPreferences.alumni}
                            onChange={handleUserPreferencesChange}
                            required
                            min="0"
                            max="10"
                        />
                    </div>
                    <button type="submit">Get Recommendations</button>
                </form>

                {/* Recommendations Table */}
                <h2>Your Recommended Universities</h2>
                {recommendations.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Institution Name</th>
                                <th>Quality</th>
                                <th>Research</th>
                                <th>Alumni</th>
                                <th>Similarity Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recommendations.map((uni) => (
                                <tr key={uni.id}>
                                    <td>{uni.id}</td>
                                    <td>{uni.InstitutionName}</td>
                                    <td>{uni.Quality}</td>
                                    <td>{uni.Research}</td>
                                    <td>{uni.Alumni}</td>
                                    <td>{uni.similarity.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No recommendations available. Please enter your preferences and click "Get Recommendations".</p>
                )}
            </section>
        </div>
    );

}

export default App;
