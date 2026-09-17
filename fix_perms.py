import os, sys, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, r'd:\Python Files\New agent')
from dotenv import load_dotenv; load_dotenv(r'd:\Python Files\New agent\.env')
from appwrite.client import Client
from appwrite.services.databases import Databases

client = Client()
client.set_endpoint('https://sgp.cloud.appwrite.io/v1').set_project('6a909f2d001e307f0ef3').set_key(os.getenv('APPWRITE_API_KEY'))
db = Databases(client)

try:
    db.update_collection('intern_hunt_db', 'startups', name='Startups', permissions=['read("users")'])
    print('Startups permissions updated')
    db.update_collection('intern_hunt_db', 'lead_profiles', name='Lead Profiles', permissions=['read("users")'])
    print('Lead Profiles permissions updated')
    db.update_collection('intern_hunt_db', 'user_profiles', name='User Profiles', permissions=['read("users")', 'write("users")'], document_security=True)
    print('User Profiles permissions updated')
except Exception as e:
    print('Error:', e)
