import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { resolveImageUrl } from '../utils/resolveImageUrl';
import Toast from '../components/Common/Toast';
import ConfirmModal from '../components/Common/ConfirmModal';
import useToast from '../hooks/useToast';
import useConfirm from '../hooks/useConfirm';
import ReportManagement from '../components/Admin/ReportManagement';
import AIMetrics from '../components/Admin/AIMetrics';
import DataTable from '../components/Common/DataTable';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState('applications'); // applications, recipes, ingredients, users, reports, ai-metrics
  const [activeTab, setActiveTab] = useState('pending'); // For sub-tabs (pending, all)
  const [applications, setApplications] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [ingredientRequests, setIngredientRequests] = useState([]);
  const [ingredientRequestStatus, setIngredientRequestStatus] = useState('pending');
  const [ingredientRequestEdits, setIngredientRequestEdits] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedIngredientRequest, setSelectedIngredientRequest] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [userEditName, setUserEditName] = useState('');
  const [userEditEmail, setUserEditEmail] = useState('');

  const [recipesMode, setRecipesMode] = useState('pending'); // pending, all
  const [allRecipes, setAllRecipes] = useState([]);
  const [selectedManageRecipe, setSelectedManageRecipe] = useState(null);
  const [showManageRecipeModal, setShowManageRecipeModal] = useState(false);
  const [manageRecipeTitle, setManageRecipeTitle] = useState('');
  const [manageRecipeStatus, setManageRecipeStatus] = useState('');
  const [manageRecipeDeleted, setManageRecipeDeleted] = useState(false);
  const [manageRecipeChefId, setManageRecipeChefId] = useState('');
  const [manageRecipeDescription, setManageRecipeDescription] = useState('');
  const [manageRecipeInstructionsText, setManageRecipeInstructionsText] = useState('');
  const [manageRecipeIngredients, setManageRecipeIngredients] = useState([]);
  const [manageRecipePrepTime, setManageRecipePrepTime] = useState('');
  const [manageRecipeCookTime, setManageRecipeCookTime] = useState('');
  const [manageRecipeServings, setManageRecipeServings] = useState('');
  const [manageRecipeDifficulty, setManageRecipeDifficulty] = useState('');
  const [manageRecipeCuisine, setManageRecipeCuisine] = useState('');
  const [manageRecipeSpice, setManageRecipeSpice] = useState('');
  const [manageRecipeCalories, setManageRecipeCalories] = useState('');
  const [manageRecipeImageUrl, setManageRecipeImageUrl] = useState('');

  const [ingredientsMode, setIngredientsMode] = useState('requests'); // requests, ingredients
  const [ingredients, setIngredients] = useState([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientCategory, setNewIngredientCategory] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [showIngredientEditModal, setShowIngredientEditModal] = useState(false);
  const [ingredientEditName, setIngredientEditName] = useState('');
  const [ingredientEditCategory, setIngredientEditCategory] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRecipeRejectModal, setShowRecipeRejectModal] = useState(false);
  const [showIngredientRejectModal, setShowIngredientRejectModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [ingredientFeedback, setIngredientFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Use custom hooks for toast and confirm
  const { toast, showToast, hideToast } = useToast();
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm();

  const fetchApplications = async (status = null) => {
    try {
      setLoading(true);
      setError('');
      
      let url = '/api/admin/chef-applications';
      if (status && status !== 'all') {
        url += `?status=${status}`;
      }
      
      const response = await api.get(url);
      setApplications(response.data.applications || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.response?.data?.error || 'Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/recipes/pending');
      setRecipes(response.data.recipes || []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError(err.response?.data?.error || 'Failed to load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecipes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/recipes', { params: { includeDeleted: true } });
      setAllRecipes(response.data.recipes || []);
    } catch (err) {
      console.error('Error fetching all recipes:', err);
      setError(err.response?.data?.error || 'Failed to load recipes');
      setAllRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/users');
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredientRequests = async (status = 'pending') => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/ingredient-requests', {
        params: { status }
      });

      const requests = response.data.requests || [];
      setIngredientRequests(requests);

      // Initialize editable names for pending requests
      setIngredientRequestEdits((prev) => {
        const next = { ...prev };
        requests.forEach((r) => {
          if (r.status === 'pending' && next[r.id] === undefined) {
            next[r.id] = r.requested_name || '';
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Error fetching ingredient requests:', err);
      setError(err.response?.data?.error || 'Failed to load ingredient requests');
      setIngredientRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/ingredients');
      setIngredients(response.data.ingredients || []);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      setError(err.response?.data?.error || 'Failed to load ingredients');
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'applications') {
      const status = activeTab === 'all' ? null : activeTab;
      fetchApplications(status);
    } else if (mainTab === 'recipes') {
      if (recipesMode === 'all') {
        fetchAllRecipes();
      } else {
        fetchRecipes();
      }
    } else if (mainTab === 'ingredients') {
      if (ingredientsMode === 'ingredients') {
        fetchIngredients();
      } else {
        fetchIngredientRequests(ingredientRequestStatus);
      }
    } else if (mainTab === 'users') {
      fetchUsers();
    }
  }, [mainTab, activeTab, ingredientRequestStatus, recipesMode, ingredientsMode]);

  const handleApprove = async (applicationId) => {
    showConfirm({
      message: 'Are you sure you want to approve this chef application?',
      confirmStyle: 'success',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.post(`/api/admin/chef-applications/${applicationId}/approve`);
          
          // Refresh applications
          const status = activeTab === 'all' ? null : activeTab;
          await fetchApplications(status);
          
          showToast('Application approved successfully! User is now a chef.', 'success');
        } catch (err) {
          console.error('Error approving application:', err);
          showToast(err.response?.data?.error || 'Failed to approve application', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      showToast('Please provide feedback for rejection', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/admin/chef-applications/${selectedApplication.id}/reject`, {
        feedback: feedback.trim()
      });
      
      // Close modal and refresh
      setShowRejectModal(false);
      setSelectedApplication(null);
      setFeedback('');
      
      const status = activeTab === 'all' ? null : activeTab;
      await fetchApplications(status);
      
      showToast('Application rejected with feedback sent to applicant.', 'success');
    } catch (err) {
      console.error('Error rejecting application:', err);
      showToast(err.response?.data?.error || 'Failed to reject application', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (application) => {
    setSelectedApplication(application);
    setShowRejectModal(true);
    setFeedback('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedApplication(null);
    setFeedback('');
  };

  // Recipe approval handlers
  const handleApproveRecipe = async (recipeId) => {
    showConfirm({
      message: 'Are you sure you want to approve this recipe?',
      confirmStyle: 'success',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.post(`/api/admin/recipes/${recipeId}/approve`);
          
          await fetchRecipes();
          showToast('Recipe approved successfully!', 'success');
        } catch (err) {
          console.error('Error approving recipe:', err);
          showToast(err.response?.data?.error || 'Failed to approve recipe', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleRejectRecipe = async () => {
    if (!feedback.trim()) {
      showToast('Please provide feedback for rejection', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/admin/recipes/${selectedRecipe.id}/reject`, {
        feedback: feedback.trim()
      });
      
      setShowRecipeRejectModal(false);
      setSelectedRecipe(null);
      setFeedback('');
      
      await fetchRecipes();
      showToast('Recipe rejected with feedback.', 'success');
    } catch (err) {
      console.error('Error rejecting recipe:', err);
      showToast(err.response?.data?.error || 'Failed to reject recipe', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openRecipeRejectModal = (recipe) => {
    setSelectedRecipe(recipe);
    setShowRecipeRejectModal(true);
    setFeedback('');
  };

  const closeRecipeRejectModal = () => {
    setShowRecipeRejectModal(false);
    setSelectedRecipe(null);
    setFeedback('');
  };

  // Ingredient request moderation handlers
  const handleApproveIngredientRequest = async (requestId) => {
    showConfirm({
      message: 'Approve this ingredient request and add it to the ingredient list?',
      confirmStyle: 'success',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const editedName = (ingredientRequestEdits[requestId] || '').trim();
          await api.post(`/api/admin/ingredient-requests/${requestId}/approve`, {
            ...(editedName ? { name: editedName } : {}),
          });
          await fetchIngredientRequests(ingredientRequestStatus);
          showToast('Ingredient request approved and ingredient added.', 'success');
        } catch (err) {
          console.error('Error approving ingredient request:', err);
          showToast(err.response?.data?.error || 'Failed to approve ingredient request', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleRejectIngredientRequest = async () => {
    if (!selectedIngredientRequest) return;

    try {
      setActionLoading(true);
      await api.post(`/api/admin/ingredient-requests/${selectedIngredientRequest.id}/reject`, {
        feedback: ingredientFeedback.trim() || null,
      });

      setShowIngredientRejectModal(false);
      setSelectedIngredientRequest(null);
      setIngredientFeedback('');

      await fetchIngredientRequests(ingredientRequestStatus);
      showToast('Ingredient request rejected.', 'success');
    } catch (err) {
      console.error('Error rejecting ingredient request:', err);
      showToast(err.response?.data?.error || 'Failed to reject ingredient request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openIngredientRejectModal = (request) => {
    setSelectedIngredientRequest(request);
    setShowIngredientRejectModal(true);
    setIngredientFeedback('');
  };

  const closeIngredientRejectModal = () => {
    setShowIngredientRejectModal(false);
    setSelectedIngredientRequest(null);
    setIngredientFeedback('');
  };

  // User management handlers
  const handleChangeUserRole = async (userId, newRole, userName) => {
    showConfirm({
      message: `Change ${userName}'s role to ${newRole}?`,
      confirmStyle: 'primary',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
          
          await fetchUsers();
          showToast(`User role updated to ${newRole} successfully!`, 'success');
        } catch (err) {
          console.error('Error changing user role:', err);
          showToast(err.response?.data?.error || 'Failed to change user role', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const openUserEditModal = (user) => {
    setSelectedUser(user);
    setUserEditName(String(user?.name || ''));
    setUserEditEmail(String(user?.email || ''));
    setShowUserEditModal(true);
  };

  const closeUserEditModal = () => {
    setShowUserEditModal(false);
    setSelectedUser(null);
    setUserEditName('');
    setUserEditEmail('');
  };

  const handleSaveUserProfile = async () => {
    if (!selectedUser?.id) return;
    const name = String(userEditName || '').trim();
    const email = String(userEditEmail || '').trim();
    if (!name) {
      showToast('Name is required', 'error');
      return;
    }
    if (!email) {
      showToast('Email is required', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.patch(`/api/admin/users/${selectedUser.id}`, { name, email });
      await fetchUsers();
      showToast('User updated successfully', 'success');
      closeUserEditModal();
    } catch (err) {
      console.error('Error updating user:', err);
      showToast(err.response?.data?.error || 'Failed to update user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!user?.id) return;
    showConfirm({
      message: `Delete user ${user.name}? This cannot be undone.`,
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/api/admin/users/${user.id}`);
          await fetchUsers();
          showToast('User deleted', 'success');
        } catch (err) {
          console.error('Error deleting user:', err);
          showToast(err.response?.data?.error || 'Failed to delete user', 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const openManageRecipeModal = async (recipe) => {
    if (!recipe?.id) return;
    try {
      setActionLoading(true);
      const detail = await api.get(`/api/recipes/${recipe.id}`);
      const full = detail.data || recipe;

      setSelectedManageRecipe(full);
      setManageRecipeTitle(String(full?.title || ''));
      setManageRecipeDescription(String(full?.description || ''));
      setManageRecipeStatus(String(full?.status || ''));
      setManageRecipeDeleted(Boolean(full?.deleted_at));
      setManageRecipeChefId(full?.chef_id != null ? String(full.chef_id) : '');
      setManageRecipeImageUrl(String(full?.image_url || ''));
      setManageRecipePrepTime(full?.prep_time != null ? String(full.prep_time) : '');
      setManageRecipeCookTime(full?.cook_time != null ? String(full.cook_time) : '');
      setManageRecipeServings(full?.servings != null ? String(full.servings) : '');
      setManageRecipeDifficulty(String(full?.difficulty || ''));
      setManageRecipeCuisine(String(full?.cuisine || ''));
      setManageRecipeSpice(String(full?.spice_level || ''));
      setManageRecipeCalories(full?.calories != null ? String(full.calories) : '');
      setManageRecipeInstructionsText(Array.isArray(full?.instructions) ? full.instructions.join('\n') : '');
      setManageRecipeIngredients(Array.isArray(full?.ingredients) ? full.ingredients : []);
      setShowManageRecipeModal(true);
    } catch (err) {
      console.error('Error loading recipe details (admin):', err);
      showToast(err.response?.data?.error || 'Failed to load recipe details', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const closeManageRecipeModal = () => {
    setShowManageRecipeModal(false);
    setSelectedManageRecipe(null);
    setManageRecipeTitle('');
    setManageRecipeStatus('');
    setManageRecipeDeleted(false);
    setManageRecipeChefId('');
    setManageRecipeDescription('');
    setManageRecipeInstructionsText('');
    setManageRecipeIngredients([]);
    setManageRecipePrepTime('');
    setManageRecipeCookTime('');
    setManageRecipeServings('');
    setManageRecipeDifficulty('');
    setManageRecipeCuisine('');
    setManageRecipeSpice('');
    setManageRecipeCalories('');
    setManageRecipeImageUrl('');
  };

  const updateManageIngredient = (index, patch) => {
    setManageRecipeIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] || {}), ...patch };
      return next;
    });
  };

  const addManageIngredient = () => {
    setManageRecipeIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }]);
  };

  const removeManageIngredient = (index) => {
    setManageRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveManagedRecipe = async () => {
    if (!selectedManageRecipe?.id) return;
    const title = String(manageRecipeTitle || '').trim();
    if (!title) {
      showToast('Title is required', 'error');
      return;
    }
    const description = String(manageRecipeDescription || '').trim();
    if (!description) {
      showToast('Description is required', 'error');
      return;
    }
    const steps = String(manageRecipeInstructionsText || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length === 0) {
      showToast('Instructions are required (one step per line)', 'error');
      return;
    }

    const toNullableInt = (value) => {
      const v = String(value ?? '').trim();
      if (!v) return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : NaN;
    };

    const chefId = toNullableInt(manageRecipeChefId);
    if (Number.isNaN(chefId)) {
      showToast('Chef ID must be a number (or blank)', 'error');
      return;
    }

    const prepTime = toNullableInt(manageRecipePrepTime);
    const cookTime = toNullableInt(manageRecipeCookTime);
    const servings = toNullableInt(manageRecipeServings);
    const calories = toNullableInt(manageRecipeCalories);
    if ([prepTime, cookTime, servings, calories].some((n) => Number.isNaN(n))) {
      showToast('prep/cook/servings/calories must be numbers (or blank)', 'error');
      return;
    }

    const ingredients = (manageRecipeIngredients || []).map((ing) => ({
      name: String(ing?.name || '').trim(),
      quantity: String(ing?.quantity || '').trim(),
      unit: String(ing?.unit || '').trim(),
    }));
    try {
      setActionLoading(true);
      await api.patch(`/api/admin/recipes/${selectedManageRecipe.id}`, {
        title,
        description,
        status: manageRecipeStatus,
        deleted: manageRecipeDeleted,
        chef_id: chefId,
        instructions: steps,
        ingredients,
        image_url: String(manageRecipeImageUrl || '').trim() || null,
        prep_time: prepTime,
        cook_time: cookTime,
        servings,
        difficulty: String(manageRecipeDifficulty || '').trim() || null,
        cuisine: String(manageRecipeCuisine || '').trim() || null,
        spice_level: String(manageRecipeSpice || '').trim() || null,
        calories,
      });
      await fetchAllRecipes();
      showToast('Recipe updated', 'success');
      closeManageRecipeModal();
    } catch (err) {
      console.error('Error updating recipe (admin):', err);
      showToast(err.response?.data?.error || 'Failed to update recipe', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteManagedRecipe = async (recipe) => {
    if (!recipe?.id) return;
    showConfirm({
      message: `Delete recipe "${recipe.title}"? This will permanently remove it.`,
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/api/admin/recipes/${recipe.id}`);
          await fetchAllRecipes();
          showToast('Recipe deleted', 'success');
        } catch (err) {
          console.error('Error deleting recipe (admin):', err);
          showToast(err.response?.data?.error || 'Failed to delete recipe', 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleCreateIngredient = async () => {
    const name = String(newIngredientName || '').trim();
    const category = String(newIngredientCategory || '').trim();
    if (!name) {
      showToast('Ingredient name is required', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await api.post('/api/admin/ingredients', { name, category: category || null });
      setNewIngredientName('');
      setNewIngredientCategory('');
      await fetchIngredients();
      showToast('Ingredient created', 'success');
    } catch (err) {
      console.error('Error creating ingredient:', err);
      showToast(err.response?.data?.error || 'Failed to create ingredient', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openIngredientEditModal = (ingredient) => {
    setSelectedIngredient(ingredient);
    setIngredientEditName(String(ingredient?.name || ''));
    setIngredientEditCategory(String(ingredient?.category || ''));
    setShowIngredientEditModal(true);
  };

  const closeIngredientEditModal = () => {
    setShowIngredientEditModal(false);
    setSelectedIngredient(null);
    setIngredientEditName('');
    setIngredientEditCategory('');
  };

  const handleSaveIngredient = async () => {
    if (!selectedIngredient?.id) return;
    const name = String(ingredientEditName || '').trim();
    const category = String(ingredientEditCategory || '').trim();
    if (!name) {
      showToast('Ingredient name is required', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await api.patch(`/api/admin/ingredients/${selectedIngredient.id}`, { name, category: category || null });
      await fetchIngredients();
      showToast('Ingredient updated', 'success');
      closeIngredientEditModal();
    } catch (err) {
      console.error('Error updating ingredient:', err);
      showToast(err.response?.data?.error || 'Failed to update ingredient', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteIngredient = async (ingredient) => {
    if (!ingredient?.id) return;
    showConfirm({
      message: `Delete ingredient "${ingredient.name}"?`,
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          await api.delete(`/api/admin/ingredients/${ingredient.id}`);
          await fetchIngredients();
          showToast('Ingredient deleted', 'success');
        } catch (err) {
          console.error('Error deleting ingredient:', err);
          showToast(err.response?.data?.error || 'Failed to delete ingredient', 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <main className="w-full px-3 sm:px-4 lg:max-w-7xl lg:mx-auto py-6 sm:py-8 lg:py-10">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Admin Dashboard
        </h1>

        {/* Main Tabs - Horizontally Scrollable on Mobile */}
        <div className="overflow-x-auto border-b-2 border-gray-300 dark:border-gray-600 mb-6 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <div className="flex space-x-2 sm:space-x-4 min-w-max sm:min-w-0">
            <button
              onClick={() => setMainTab('applications')}
              className={`pb-2 px-3 sm:px-4 font-semibold transition-colors whitespace-nowrap ${
                mainTab === 'applications'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Chef Applications
            </button>
            <button
              onClick={() => setMainTab('recipes')}
              className={`pb-2 px-3 sm:px-4 font-semibold transition-colors whitespace-nowrap ${
                mainTab === 'recipes'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Recipes
            </button>
            <button
              onClick={() => setMainTab('users')}
              className={`pb-2 px-3 sm:px-4 font-semibold transition-colors whitespace-nowrap ${
                mainTab === 'users'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setMainTab('ingredients')}
              className={`pb-2 px-3 sm:px-4 font-semibold transition-colors whitespace-nowrap ${
                mainTab === 'ingredients'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Ingredients
            </button>
            <button
              onClick={() => setMainTab('reports')}
              className={`pb-2 px-3 sm:px-4 font-semibold transition-colors whitespace-nowrap ${
                mainTab === 'reports'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Content Reports
            </button>
            <button
              onClick={() => setMainTab('ai-metrics')}
              className={`pb-2 px-3 sm:px-4 font-semibold transition-colors whitespace-nowrap ${
                mainTab === 'ai-metrics'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400 -mb-[2px]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              AI Metrics
            </button>
          </div>
        </div>

        {/* Sub-Tabs for Applications - Scrollable on Mobile */}
        {mainTab === 'applications' && (
          <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
            <div className="flex space-x-2 sm:space-x-4 min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-2 px-3 sm:px-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Pending Applications
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-2 px-3 sm:px-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                All Applications
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {mainTab === 'applications' && (
          <>
            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading applications...</p>
              </div>
            ) : (
              <DataTable
                title={activeTab === 'pending' ? 'Pending Applications' : 'All Applications'}
                data={applications}
                emptyMessage={activeTab === 'pending' ? 'No pending applications at the moment.' : 'No applications found.'}
                searchPlaceholder="Search applications…"
                initialPageSize={10}
                columns={[
                  {
                    header: 'Applicant',
                    id: 'applicant',
                    accessorFn: (a) => `${a.applicant_name || ''} ${a.applicant_email || ''}`,
                    cell: ({ row }) => (
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{row.original.applicant_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.applicant_email}</div>
                      </div>
                    ),
                  },
                  {
                    header: 'Application',
                    id: 'application',
                    accessorFn: (a) =>
                      [
                        a.full_name,
                        a.specialty,
                        a.bio,
                        a.motivation,
                        a.sample_recipe_title,
                        a.sample_recipe_description,
                        a.demo_video_url,
                        a.portfolio_url,
                        a.instagram_handle,
                      ]
                        .filter(Boolean)
                        .join(' '),
                    cell: ({ row }) => {
                      const app = row.original;
                      return (
                        <div className="space-y-3">
                          <div>
                            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{app.full_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Submitted:{' '}
                              {app.created_at
                                ? new Date(app.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })
                                : 'N/A'}
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Experience</div>
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {app.experience_years ? `${app.experience_years} years` : 'Not specified'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Specialty</div>
                              <div className="text-sm text-gray-900 dark:text-gray-100">{app.specialty || 'Not specified'}</div>
                            </div>
                          </div>

                          {app.bio ? (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bio</div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words line-clamp-4">
                                {app.bio}
                              </div>
                            </div>
                          ) : null}

                          {app.sample_recipe_title ? (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sample Recipe</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{app.sample_recipe_title}</div>
                              {app.sample_recipe_description ? (
                                <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                                  {app.sample_recipe_description}
                                </div>
                              ) : null}
                              {Array.isArray(app.sample_recipe_images) && app.sample_recipe_images.length > 0 ? (
                                <div className="mt-2 flex gap-2 overflow-x-auto">
                                  {app.sample_recipe_images.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt={`Recipe ${idx + 1}`}
                                      className="h-16 w-16 object-cover rounded"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {(app.demo_video_url || app.portfolio_url || app.instagram_handle) && (
                            <div className="text-xs text-gray-700 dark:text-gray-300">
                              {app.demo_video_url ? (
                                <a
                                  href={app.demo_video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 dark:text-green-400 hover:underline mr-3"
                                >
                                  Demo video
                                </a>
                              ) : null}
                              {app.portfolio_url ? (
                                <a
                                  href={app.portfolio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 dark:text-green-400 hover:underline mr-3"
                                >
                                  Portfolio
                                </a>
                              ) : null}
                              {app.instagram_handle ? (
                                <a
                                  href={`https://instagram.com/${app.instagram_handle.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 dark:text-green-400 hover:underline"
                                >
                                  {app.instagram_handle}
                                </a>
                              ) : null}
                            </div>
                          )}

                          {app.motivation ? (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Why Join ReciFind?</div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words line-clamp-4">
                                {app.motivation}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    header: 'Status',
                    accessorKey: 'status',
                    cell: ({ row }) => getStatusBadge(row.original.status),
                  },
                  {
                    header: 'Reviewed',
                    id: 'reviewed',
                    accessorFn: (a) => `${a.reviewer_name || ''} ${a.reviewed_at || ''} ${a.admin_feedback || ''}`,
                    cell: ({ row }) => {
                      const app = row.original;
                      if (app.status === 'pending') {
                        return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;
                      }

                      return (
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {app.reviewer_name || 'Unknown'}
                            {app.reviewed_at
                              ? ` • ${new Date(app.reviewed_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}`
                              : ''}
                          </div>
                          {app.admin_feedback ? (
                            <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">{app.admin_feedback}</div>
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    header: 'Actions',
                    id: 'actions',
                    enableSorting: false,
                    cell: ({ row }) => {
                      const app = row.original;
                      if (app.status !== 'pending') return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;

                      return (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-3 rounded-lg transition duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(app)}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-3 rounded-lg transition duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </>
        )}

        {/* RECIPES TAB */}
        {mainTab === 'recipes' && (
          <>
            <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex space-x-2 sm:space-x-4 min-w-max sm:min-w-0">
                <button
                  onClick={() => setRecipesMode('pending')}
                  className={`pb-2 px-3 sm:px-4 font-medium transition-colors whitespace-nowrap ${
                    recipesMode === 'pending'
                      ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Pending Approvals
                </button>
                <button
                  onClick={() => setRecipesMode('all')}
                  className={`pb-2 px-3 sm:px-4 font-medium transition-colors whitespace-nowrap ${
                    recipesMode === 'all'
                      ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  All Recipes
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recipes...</p>
              </div>
            ) : recipesMode === 'pending' && recipes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  No pending recipes at the moment.
                </p>
              </div>
            ) : recipesMode === 'pending' ? (
              <DataTable
                title="Pending Recipes"
                data={recipes}
                searchPlaceholder="Search pending recipes…"
                initialPageSize={10}
                columns={[
                  {
                    header: 'Recipe',
                    accessorKey: 'title',
                    cell: ({ row }) => (
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{row.original.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {row.original.description}
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Chef',
                    id: 'chef',
                    accessorFn: (r) => `${r.chef_name || ''} ${r.chef_email || ''}`,
                    cell: ({ row }) => (
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.original.chef_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.chef_email}</div>
                      </div>
                    ),
                  },
                  {
                    header: 'Submitted',
                    accessorKey: 'created_at',
                    cell: ({ row }) => (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : ''}
                      </span>
                    ),
                  },
                  {
                    header: 'Pending Ingredients',
                    id: 'pending_ingredients',
                    accessorFn: (r) => (Array.isArray(r.pending_ingredients) ? r.pending_ingredients.join(', ') : ''),
                    cell: ({ row }) => {
                      const pending = Array.isArray(row.original.pending_ingredients) ? row.original.pending_ingredients : [];
                      if (!pending.length) return <span className="text-sm text-gray-500 dark:text-gray-400">None</span>;
                      return (
                        <div className="text-xs">
                          <div className="font-semibold text-yellow-800 dark:text-yellow-200">{pending.length} pending</div>
                          <div className="text-yellow-900 dark:text-yellow-100 line-clamp-2">{pending.join(', ')}</div>
                        </div>
                      );
                    },
                  },
                  {
                    header: 'Info',
                    id: 'info',
                    accessorFn: (r) => `${r.cuisine || ''} ${r.difficulty || ''} ${r.prep_time || ''} ${r.cook_time || ''}`,
                    cell: ({ row }) => (
                      <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        <div>Cuisine: {row.original.cuisine || 'N/A'}</div>
                        <div>Difficulty: {row.original.difficulty || 'N/A'}</div>
                        <div>
                          Time: {row.original.prep_time || 'N/A'} + {row.original.cook_time || 'N/A'} min
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Image',
                    id: 'image',
                    accessorFn: (r) => r.image_url || '',
                    enableSorting: false,
                    cell: ({ row }) =>
                      row.original.image_url ? (
                        <img
                          src={resolveImageUrl(row.original.image_url)}
                          alt={row.original.title}
                          className="h-12 w-16 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                      ),
                  },
                  {
                    header: 'Actions',
                    id: 'actions',
                    enableSorting: false,
                    cell: ({ row }) => {
                      const recipe = row.original;
                      const hasPending = Array.isArray(recipe.pending_ingredients) && recipe.pending_ingredients.length > 0;
                      return (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                            disabled={actionLoading}
                            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 dark:disabled:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleApproveRecipe(recipe.id)}
                            disabled={actionLoading || hasPending}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRecipeRejectModal(recipe)}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      );
                    },
                  },
                ]}
              />
            ) : allRecipes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No recipes found.</p>
              </div>
            ) : (
              <DataTable
                title="All Recipes"
                data={allRecipes}
                searchPlaceholder="Search recipes…"
                initialPageSize={10}
                columns={[
                  {
                    header: 'Title',
                    accessorKey: 'title',
                    cell: ({ row }) => (
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{row.original.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {row.original.chef_name ? `By ${row.original.chef_name}` : '—'}
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Status',
                    accessorKey: 'status',
                    cell: (info) => getStatusBadge(info.getValue()),
                  },
                  {
                    header: 'Deleted',
                    id: 'deleted',
                    accessorFn: (r) => (r.deleted_at ? 'Yes' : 'No'),
                    cell: ({ row }) => (
                      <span className="text-sm text-gray-600 dark:text-gray-300">{row.original.deleted_at ? 'Yes' : 'No'}</span>
                    ),
                  },
                  {
                    header: 'Created',
                    accessorKey: 'created_at',
                    cell: (info) => (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {info.getValue() ? new Date(info.getValue()).toLocaleDateString() : ''}
                      </span>
                    ),
                  },
                  {
                    header: 'Actions',
                    id: 'actions',
                    enableSorting: false,
                    cell: ({ row }) => {
                      const recipe = row.original;
                      return (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                            disabled={actionLoading}
                            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 dark:disabled:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openManageRecipeModal(recipe)}
                            disabled={actionLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteManagedRecipe(recipe)}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </>
        )}

        {/* INGREDIENT REQUESTS TAB */}
        {mainTab === 'ingredients' && (
          <>
            <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex space-x-2 sm:space-x-4 min-w-max sm:min-w-0">
                <button
                  onClick={() => setIngredientsMode('requests')}
                  className={`pb-2 px-3 sm:px-4 font-medium transition-colors whitespace-nowrap ${
                    ingredientsMode === 'requests'
                      ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Requests
                </button>
                <button
                  onClick={() => setIngredientsMode('ingredients')}
                  className={`pb-2 px-3 sm:px-4 font-medium transition-colors whitespace-nowrap ${
                    ingredientsMode === 'ingredients'
                      ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Ingredients List
                </button>
              </div>
            </div>

            {ingredientsMode === 'ingredients' ? (
              <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ingredients</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add, edit, or delete ingredients in the global list.</p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    placeholder="Ingredient name"
                    className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    value={newIngredientCategory}
                    onChange={(e) => setNewIngredientCategory(e.target.value)}
                    placeholder="Category (optional)"
                    className="w-full sm:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={handleCreateIngredient}
                    disabled={actionLoading}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ingredient Requests</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Approve to add an ingredient to the global list, or reject with feedback.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={ingredientRequestStatus}
                    onChange={(e) => setIngredientRequestStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={() => fetchIngredientRequests(ingredientRequestStatus)}
                    disabled={loading}
                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  {ingredientsMode === 'ingredients' ? 'Loading ingredients...' : 'Loading ingredient requests...'}
                </p>
              </div>
            ) : ingredientsMode === 'ingredients' ? (
              ingredients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No ingredients found.</p>
                </div>
              ) : (
                <DataTable
                  title={null}
                  data={ingredients}
                  searchPlaceholder="Search ingredients…"
                  initialPageSize={10}
                  columns={[
                    {
                      header: 'Name',
                      accessorKey: 'name',
                      cell: (info) => (
                        <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue()}</span>
                      ),
                    },
                    {
                      header: 'Category',
                      accessorKey: 'category',
                      cell: (info) => (
                        <span className="text-gray-500 dark:text-gray-400">{info.getValue() || '—'}</span>
                      ),
                    },
                    {
                      header: 'Actions',
                      id: 'actions',
                      enableSorting: false,
                      cell: ({ row }) => {
                        const ing = row.original;
                        return (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openIngredientEditModal(ing)}
                              disabled={actionLoading}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(ing)}
                              disabled={actionLoading}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        );
                      },
                    },
                  ]}
                />
              )
            ) : ingredientRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No ingredient requests found.</p>
              </div>
            ) : (
              <DataTable
                title={null}
                data={ingredientRequests}
                searchPlaceholder="Search ingredient requests…"
                initialPageSize={10}
                columns={[
                  {
                    header: 'Ingredient',
                    id: 'ingredient',
                    accessorFn: (r) => ingredientRequestEdits[r.id] ?? r.requested_name ?? '',
                    cell: ({ row }) => {
                      const req = row.original;
                      const value = ingredientRequestEdits[req.id] ?? req.requested_name ?? '';
                      return req.status === 'pending' ? (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                            Edit before approving
                          </div>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setIngredientRequestEdits((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                            className="w-full min-w-[220px] max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="e.g., coriander"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{req.requested_name}</span>
                      );
                    },
                  },
                  {
                    header: 'Requested By',
                    id: 'requested_by',
                    accessorFn: (r) => `${r.requested_by_name || ''} ${r.requested_by_email || ''}`,
                    cell: ({ row }) => (
                      <div>
                        <div className="text-sm text-gray-900 dark:text-gray-100">{row.original.requested_by_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.requested_by_email || ''}</div>
                      </div>
                    ),
                  },
                  {
                    header: 'Submitted',
                    accessorKey: 'created_at',
                    cell: ({ row }) => (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    ),
                  },
                  {
                    header: 'Status',
                    accessorKey: 'status',
                    cell: ({ row }) => getStatusBadge(row.original.status),
                  },
                  {
                    header: 'Reviewed',
                    id: 'reviewed',
                    accessorFn: (r) => `${r.reviewed_by_name || ''} ${r.reviewed_at || ''}`,
                    cell: ({ row }) => {
                      const r = row.original;
                      if (r.status === 'pending') return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;
                      return (
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          <div>{r.reviewed_by_name || 'N/A'}</div>
                          <div>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ''}</div>
                        </div>
                      );
                    },
                  },
                  {
                    header: 'Admin Notes',
                    id: 'admin_notes',
                    accessorKey: 'admin_notes',
                    cell: ({ row }) =>
                      row.original.admin_notes ? (
                        <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                          {row.original.admin_notes}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      ),
                  },
                  {
                    header: 'Actions',
                    id: 'actions',
                    enableSorting: false,
                    cell: ({ row }) => {
                      const req = row.original;
                      if (req.status !== 'pending') return <span className="text-sm text-gray-500 dark:text-gray-400">—</span>;
                      return (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleApproveIngredientRequest(req.id)}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openIngredientRejectModal(req)}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-1.5 px-3 rounded-lg transition duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </>
        )}

        {/* USERS TAB */}
        {mainTab === 'users' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No users found.</p>
              </div>
            ) : (
              <DataTable
                title="Users"
                data={users}
                searchPlaceholder="Search users…"
                columns={[
                  {
                    header: 'Name',
                    accessorKey: 'name',
                    cell: (info) => (
                      <span className="font-medium text-gray-900 dark:text-gray-100">{info.getValue()}</span>
                    ),
                  },
                  {
                    header: 'Email',
                    accessorKey: 'email',
                    cell: (info) => (
                      <span className="text-gray-500 dark:text-gray-400">{info.getValue()}</span>
                    ),
                  },
                  {
                    header: 'Role',
                    accessorKey: 'role',
                    cell: (info) => {
                      const role = info.getValue();
                      return (
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${role === 'admin'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : role === 'chef'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {role}
                        </span>
                      );
                    },
                  },
                  {
                    header: 'Reputation',
                    accessorKey: 'reputation_score',
                    cell: (info) => (
                      <span className="text-gray-500 dark:text-gray-400">{info.getValue() || 0}</span>
                    ),
                  },
                  {
                    header: 'Joined',
                    accessorKey: 'created_at',
                    cell: (info) => (
                      <span className="text-gray-500 dark:text-gray-400">
                        {info.getValue() ? new Date(info.getValue()).toLocaleDateString() : ''}
                      </span>
                    ),
                  },
                  {
                    header: 'Actions',
                    id: 'actions',
                    enableSorting: false,
                    cell: ({ row }) => {
                      const user = row.original;
                      return (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openUserEditModal(user)}
                            disabled={actionLoading}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={actionLoading}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                          {user.role === 'user' ? (
                            <button
                              onClick={() => handleChangeUserRole(user.id, 'chef', user.name)}
                              disabled={actionLoading}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Promote to Chef
                            </button>
                          ) : null}
                          {user.role === 'chef' ? (
                            <button
                              onClick={() => handleChangeUserRole(user.id, 'user', user.name)}
                              disabled={actionLoading}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                            >
                              Demote to User
                            </button>
                          ) : null}
                        </div>
                      );
                    },
                  },
                ]}
              />
            )}
          </>
        )}

        {/* Reports Tab Content */}
        {mainTab === 'reports' && (
          <ReportManagement />
        )}

        {/* AI Metrics Tab Content */}
        {mainTab === 'ai-metrics' && (
          <AIMetrics />
        )}
      </div>

      {/* Application Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Reject Application
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide feedback to help the applicant improve their submission:
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain why the application was rejected and what can be improved..."
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleReject}
                disabled={actionLoading || !feedback.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {actionLoading ? 'Rejecting...' : 'Reject with Feedback'}
              </button>
              <button
                onClick={closeRejectModal}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Reject Modal */}
      {showRecipeRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Reject Recipe
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide feedback to help the chef improve their recipe:
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain why the recipe was rejected and what can be improved..."
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleRejectRecipe}
                disabled={actionLoading || !feedback.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {actionLoading ? 'Rejecting...' : 'Reject with Feedback'}
              </button>
              <button
                onClick={closeRecipeRejectModal}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Request Reject Modal */}
      {showIngredientRejectModal && selectedIngredientRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Reject Ingredient Request
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Ingredient: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedIngredientRequest.requested_name}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Optional: provide feedback (e.g., use an existing ingredient name).
            </p>
            <textarea
              value={ingredientFeedback}
              onChange={(e) => setIngredientFeedback(e.target.value)}
              placeholder="Feedback (optional)..."
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleRejectIngredientRequest}
                disabled={actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={closeIngredientRejectModal}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {showUserEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Edit User</h3>

            <label htmlFor="admin-edit-user-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              id="admin-edit-user-name"
              value={userEditName}
              onChange={(e) => setUserEditName(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <label htmlFor="admin-edit-user-email" className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              id="admin-edit-user-email"
              value={userEditEmail}
              onChange={(e) => setUserEditEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveUserProfile}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {actionLoading ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={closeUserEditModal}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Manage Modal */}
      {showManageRecipeModal && selectedManageRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Recipe</h3>
              </div>

              <div className="px-4 sm:px-6 py-4 overflow-y-auto">

            <label htmlFor="admin-edit-recipe-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input
              id="admin-edit-recipe-title"
              value={manageRecipeTitle}
              onChange={(e) => setManageRecipeTitle(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <label htmlFor="admin-edit-recipe-chef" className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Chef ID</label>
            <input
              id="admin-edit-recipe-chef"
              type="number"
              value={manageRecipeChefId}
              onChange={(e) => setManageRecipeChefId(e.target.value)}
              placeholder="e.g. 5 (blank to unassign)"
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <label htmlFor="admin-edit-recipe-description" className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              id="admin-edit-recipe-description"
              value={manageRecipeDescription}
              onChange={(e) => setManageRecipeDescription(e.target.value)}
              rows="3"
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <label htmlFor="admin-edit-recipe-image" className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Image URL (optional)</label>
            <input
              id="admin-edit-recipe-image"
              value={manageRecipeImageUrl}
              onChange={(e) => setManageRecipeImageUrl(e.target.value)}
              placeholder="/uploads/... or https://..."
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <label htmlFor="admin-edit-recipe-status" className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              id="admin-edit-recipe-status"
              value={manageRecipeStatus}
              onChange={(e) => setManageRecipeStatus(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-edit-recipe-prep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prep (min)</label>
                <input
                  id="admin-edit-recipe-prep"
                  type="number"
                  value={manageRecipePrepTime}
                  onChange={(e) => setManageRecipePrepTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="admin-edit-recipe-cook" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cook (min)</label>
                <input
                  id="admin-edit-recipe-cook"
                  type="number"
                  value={manageRecipeCookTime}
                  onChange={(e) => setManageRecipeCookTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="admin-edit-recipe-servings" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Servings</label>
                <input
                  id="admin-edit-recipe-servings"
                  type="number"
                  value={manageRecipeServings}
                  onChange={(e) => setManageRecipeServings(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="admin-edit-recipe-calories" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calories</label>
                <input
                  id="admin-edit-recipe-calories"
                  type="number"
                  value={manageRecipeCalories}
                  onChange={(e) => setManageRecipeCalories(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="admin-edit-recipe-difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                <select
                  id="admin-edit-recipe-difficulty"
                  value={manageRecipeDifficulty}
                  onChange={(e) => setManageRecipeDifficulty(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">(none)</option>
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-edit-recipe-spice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Spice</label>
                <select
                  id="admin-edit-recipe-spice"
                  value={manageRecipeSpice}
                  onChange={(e) => setManageRecipeSpice(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">(none)</option>
                  <option value="mild">mild</option>
                  <option value="medium">medium</option>
                  <option value="hot">hot</option>
                </select>
              </div>
              <div>
                <label htmlFor="admin-edit-recipe-cuisine" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cuisine</label>
                <input
                  id="admin-edit-recipe-cuisine"
                  value={manageRecipeCuisine}
                  onChange={(e) => setManageRecipeCuisine(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <label htmlFor="admin-edit-recipe-instructions" className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Instructions (one step per line)</label>
            <textarea
              id="admin-edit-recipe-instructions"
              value={manageRecipeInstructionsText}
              onChange={(e) => setManageRecipeInstructionsText(e.target.value)}
              rows="5"
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ingredients</label>
                <button
                  type="button"
                  onClick={addManageIngredient}
                  className="text-sm text-green-700 dark:text-green-300 hover:underline"
                >
                  + Add
                </button>
              </div>

              <div className="mt-2 space-y-2">
                {(manageRecipeIngredients || []).map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start sm:items-center">
                    <input
                      aria-label={`Ingredient name ${idx + 1}`}
                      value={String(ing?.name || '')}
                      onChange={(e) => updateManageIngredient(idx, { name: e.target.value })}
                      placeholder="name"
                      className="w-full sm:col-span-5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      aria-label={`Ingredient quantity ${idx + 1}`}
                      value={String(ing?.quantity || '')}
                      onChange={(e) => updateManageIngredient(idx, { quantity: e.target.value })}
                      placeholder="qty"
                      className="w-full sm:col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      aria-label={`Ingredient unit ${idx + 1}`}
                      value={String(ing?.unit || '')}
                      onChange={(e) => updateManageIngredient(idx, { unit: e.target.value })}
                      placeholder="unit"
                      className="w-full sm:col-span-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeManageIngredient(idx)}
                      className="sm:col-span-1 text-sm text-red-700 dark:text-red-300 hover:underline"
                      aria-label={`Remove ingredient ${idx + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={manageRecipeDeleted}
                onChange={(e) => setManageRecipeDeleted(e.target.checked)}
              />
              Soft deleted
            </label>

              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSaveManagedRecipe}
                    disabled={actionLoading}
                    className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    {actionLoading ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={closeManageRecipeModal}
                    disabled={actionLoading}
                    className="w-full sm:flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Edit Modal */}
      {showIngredientEditModal && selectedIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Edit Ingredient</h3>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              value={ingredientEditName}
              onChange={(e) => setIngredientEditName(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <label className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <input
              value={ingredientEditCategory}
              onChange={(e) => setIngredientEditCategory(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveIngredient}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                {actionLoading ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={closeIngredientEditModal}
                disabled={actionLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Modal */}
      <ConfirmModal
        show={confirmState.show}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={actionLoading}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
      />

      {/* Reusable Toast Notification */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </main>
  );
};

export default AdminDashboard;
