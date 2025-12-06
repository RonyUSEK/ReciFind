import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ChefApplicationForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Check for existing application on mount
  useEffect(() => {
    const checkExistingApplication = async () => {
      try {
        const response = await api.get('/api/auth/my-application');
        if (response.data.application) {
          const app = response.data.application;
          if (app.status === 'pending') {
            // Redirect to application status page
            navigate('/application-status', { 
              state: { message: 'You already have a pending application' } 
            });
            return;
          } else if (app.status === 'approved') {
            navigate('/dashboard', {
              state: { message: 'You are already a chef!' }
            });
            return;
          }
          // If rejected, allow them to apply
        }
      } catch (err) {
        // No application found - can proceed
      } finally {
        setChecking(false);
      }
    };
    checkExistingApplication();
  }, [navigate]);

  const [formData, setFormData] = useState({
    full_name: '',
    experience_years: '',
    specialty: '',
    bio: '',
    portfolio_url: '',
    instagram_handle: '',
    sample_recipe_title: '',
    sample_recipe_description: '',
    sample_recipe_images: ['', '', ''],
    demo_video_url: '',
    motivation: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.sample_recipe_images];
    newImages[index] = value;
    setFormData(prev => ({
      ...prev,
      sample_recipe_images: newImages
    }));
  };

  const validateStep = (step) => {
    setError('');
    
    if (step === 1) {
      if (!formData.full_name.trim()) {
        setError('Please enter your full name');
        return false;
      }
      if (!formData.bio.trim()) {
        setError('Please tell us about yourself');
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.demo_video_url.trim()) {
        setError('Demo video is required (YouTube link)');
        return false;
      }
      // Basic URL validation
      if (!formData.demo_video_url.includes('youtube.com') && !formData.demo_video_url.includes('youtu.be')) {
        setError('Please provide a valid YouTube link');
        return false;
      }
    }
    
    if (step === 3) {
      if (!formData.motivation.trim()) {
        setError('Please share why you want to join ReciFind');
        return false;
      }
      if (formData.motivation.trim().length < 50) {
        setError('Please write at least 50 characters about your motivation');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Final validation
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    try {
      setLoading(true);

      // Filter out empty image URLs
      const filteredImages = formData.sample_recipe_images.filter(img => img.trim() !== '');

      await api.post('/api/auth/apply-chef', {
        ...formData,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        sample_recipe_images: filteredImages.length > 0 ? filteredImages : null
      });

      // Navigate to application status page
      navigate('/application-status', { 
        state: { message: 'Application submitted successfully!' } 
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Checking application status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Join as a Chef! 👨‍🍳
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Show us your cooking skills and share your recipes with food lovers
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {step}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= step 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {step === 1 && 'About You'}
                    {step === 2 && 'Show & Tell'}
                    {step === 3 && 'Why Chef?'}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Tell Us About Yourself
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What's your name? *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How long have you been cooking?
                  </label>
                  <input
                    type="number"
                    name="experience_years"
                    value={formData.experience_years}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Years (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What's your cooking style?
                  </label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Italian, BBQ, Baking, Fusion..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tell us about yourself! *
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="What got you into cooking? What do you love making? Any fun kitchen stories?"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Just be yourself - we want to know your story!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your website or blog?
                  </label>
                  <input
                    type="url"
                    name="portfolio_url"
                    value={formData.portfolio_url}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://yoursite.com (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Instagram handle?
                  </label>
                  <input
                    type="text"
                    name="instagram_handle"
                    value={formData.instagram_handle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="@yourhandle (optional)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Sample Recipe */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Show Us What You Can Do!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Share a cooking video so we can see your skills in action
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Demo Video * (YouTube Link Required)
                </label>
                <input
                  type="url"
                  name="demo_video_url"
                  value={formData.demo_video_url}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-sm text-gray-500">
                  Show us your cooking in action! Upload a video to YouTube and paste the link here.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipe Name (optional)
                </label>
                <input
                  type="text"
                  name="sample_recipe_title"
                  value={formData.sample_recipe_title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="What are you making in the video?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipe Description (optional)
                </label>
                <textarea
                  name="sample_recipe_description"
                  value={formData.sample_recipe_description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Quick description of what you're cooking..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipe Photos (optional, up to 3)
                </label>
                {formData.sample_recipe_images.map((img, index) => (
                  <input
                    key={index}
                    type="url"
                    value={img}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-2"
                    placeholder={`Photo URL ${index + 1}`}
                  />
                ))}
                <p className="text-sm text-gray-500">
                  Got photos of your dish? Add them here!
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Motivation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Why Do You Want to Join? 🎯
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What brings you to ReciFind? *
                </label>
                <textarea
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Why do you want to share your recipes? What do you hope people will learn from your cooking? Just tell us what's on your mind!"
                />
                <p className="mt-1 text-sm text-gray-500">
                  At least 50 characters - just be yourself!
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                  What happens next? 🚀
                </h3>
                <ul className="text-sm text-green-800 dark:text-green-400 space-y-1">
                  <li>✓ We'll review your application (usually within a few days)</li>
                  <li>✓ You can check status anytime in "My Applications"</li>
                  <li>✓ Once approved, you can start sharing recipes!</li>
                  <li>✓ Questions? We're always here to help</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChefApplicationForm;
