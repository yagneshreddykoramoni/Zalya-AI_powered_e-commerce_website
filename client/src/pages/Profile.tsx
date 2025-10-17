import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import BudgetPlanning from '@/components/budget/BudgetPlanning';
import OutfitSuggestions from '@/components/recommendations/OutfitSuggestions';
import { ProfilePicture } from '@/components/ProfilePicture';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [preferences, setPreferences] = useState({
    favoriteCategories: user?.preferences?.favoriteCategories || [],
    sizes: user?.preferences?.sizes || []
  });

  const registrationDate = user?.registrationDate 
    ? format(new Date(user.registrationDate), 'MMMM dd, yyyy')
    : 'N/A';

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      await updateProfile({
        name: formData.name,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileUpdate = async (values: any) => {
    try {
      await updateProfile(values);
      // Show success message
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Show error message
    }
  };

  // Add this function to handle profile picture click
  const handleProfilePictureClick = () => {
    // You can trigger file input click here if you have one
    console.log("Profile picture clicked");
  };

  const handlePreferenceChange = (category: string, type: 'favoriteCategories' | 'sizes') => {
    setPreferences(prev => {
      const current = prev[type];
      const updated = current.includes(category)
        ? current.filter(item => item !== category)
        : [...current, category];
      
      return {
        ...prev,
        [type]: updated
      };
    });
  };

  const handleSavePreferences = async () => {
    try {
      await updateProfile({
        preferences: {
          ...user?.preferences,
          ...preferences
        }
      });
      // Show success message
      console.log('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Show error message
    }
  };

  // Update preferences when user data changes
  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        favoriteCategories: user.preferences.favoriteCategories || [],
        sizes: user.preferences.sizes || []
      });
    }
  }, [user]);

  const [localPreferences, setLocalPreferences] = useState({
    favoriteCategories: user?.preferences?.favoriteCategories || [],
    sizes: user?.preferences?.sizes || []
  });
  const [isSaving, setIsSaving] = useState(false);

  // Update local preferences when user data changes
  useEffect(() => {
      if (user?.preferences) {
          setLocalPreferences({
              favoriteCategories: user.preferences.favoriteCategories || [],
              sizes: user.preferences.sizes || []
          });
      }
  }, [user?.preferences]);

  const handleLocalPreferenceChange = (category: string, type: 'favoriteCategories' | 'sizes') => {
      setLocalPreferences(prev => {
          const current = prev[type];
          const updated = current.includes(category)
              ? current.filter(item => item !== category)
              : [...current, category];
          
          return {
              ...prev,
              [type]: updated
          };
      });
  };

  const handleSaveLocalPreferences = async () => {
      setIsSaving(true);
      try {
          const response = await fetch('http://localhost:5000/api/auth/profile', { // Updated endpoint
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                  preferences: localPreferences
              })
          });
  
          if (!response.ok) {
              const errorData = await response.text();
              console.error('Server response:', errorData);
              throw new Error('Failed to save preferences');
          }
  
          const data = await response.json();
          
          // Update the user context with new preferences
          if (data.user) {
              updateProfile(data.user);
              // Update local state to match the server response
              setLocalPreferences(data.user.preferences || {
                  favoriteCategories: [],
                  sizes: []
              });
              
              toast({
                  title: "Success",
                  description: "Preferences saved successfully"
              });
          }
      } catch (error) {
          console.error('Failed to save preferences:', error);
          toast({
              title: "Error",
              description: "Failed to save preferences",
              variant: "destructive"
          });
          // Reset local preferences to match user state
          if (user?.preferences) {
              setLocalPreferences({
                  favoriteCategories: user.preferences.favoriteCategories || [],
                  sizes: user.preferences.sizes || []
              });
          }
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow py-10 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="w-full md:w-72">
              <Card>
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    <ProfilePictureUpload />
                  </div>
                  <CardTitle>{user?.name}</CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate("/orders")}
                    >
                      My Orders
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate("/wishlist")}
                    >
                      Saved Items
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main content */}
            <div className="flex-1">
              <Tabs defaultValue="profile">
                <TabsList className="mb-6">
                  <TabsTrigger value="profile">Profile Details</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="budget">Budget Planning</TabsTrigger>
                  <TabsTrigger value="suggestions">Style Suggestions</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Personal Information</CardTitle>
                        {!isEditing ? (
                          <Button variant="outline" onClick={() => setIsEditing(true)}>
                            Edit
                          </Button>
                        ) : (
                          <div className="space-x-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdate}>Save</Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        {isEditing ? (
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-gray-50">{user?.name}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            name="email"
                            value={formData.email}
                            disabled
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-gray-50">{user?.email}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Member Since</Label>
                        <div className="p-2 border rounded-md bg-gray-50">
                          {registrationDate}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle>Shopping Preferences</CardTitle>
                      <CardDescription>
                        Customize your shopping experience by setting your preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-medium mb-3">Favorite Categories</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {['clothing', 'electronics', 'homeDecor', 'beauty'].map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Checkbox
                                  id={category}
                                  checked={localPreferences.favoriteCategories.includes(category)}
                                  onCheckedChange={() => handleLocalPreferenceChange(category, 'favoriteCategories')}
                                  disabled={isSaving}
                                />
                                <Label htmlFor={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium mb-3">Sizes</h3>
                          <div className="grid grid-cols-4 gap-2">
                            {['S', 'M', 'L', 'XL'].map((size) => (
                              <div key={size} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`size-${size}`}
                                  checked={localPreferences.sizes.includes(size)}
                                  onCheckedChange={() => handleLocalPreferenceChange(size, 'sizes')}
                                  disabled={isSaving}
                                />
                                <Label htmlFor={`size-${size}`}>{size}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button 
                          className="w-full"
                          onClick={handleSaveLocalPreferences}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save Preferences'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="budget">
                  <BudgetPlanning />
                </TabsContent>
                
                <TabsContent value="suggestions">
                  <OutfitSuggestions />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
