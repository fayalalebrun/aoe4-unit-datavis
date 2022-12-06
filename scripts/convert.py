#!/usr/bin/python3
# Usage: ./convert.py <SQLITE_SOURCE> <SQLITE_DEST>
# Processes the database in order to remove redundant information and reduce size

import sys
import sqlite3
import pandas as pd

# Read data from database
conn = sqlite3.connect(sys.argv[1])

df = pd.read_sql_query("SELECT * FROM Fires", conn)

conn.close()

# Some data exploration
df['DISCOVERY_DATE'] = pd.to_datetime(df['DISCOVERY_DATE'])
df['CONT_DATE'] = pd.to_datetime(df['CONT_DATE'])

print(df.columns)
print('STATE:')
print(df['STATE'].value_counts())
print('FIRE_SIZE: ')
print(df['FIRE_SIZE'].describe())
print('DISCOVERY_DATE')
print(df['DISCOVERY_DATE'].dtypes)
print(df['NWCG_GENERAL_CAUSE'].value_counts())

df["DISCOVERY_MONTH"] = df['DISCOVERY_DATE'].dt.month
df["DISCOVERY_YEAR"] = df['DISCOVERY_DATE'].dt.year

# These are the columns we want to use in our final dataset
transfer_cols = ["STATE", "FIRE_SIZE_CLASS", "DISCOVERY_MONTH", "DISCOVERY_YEAR", "NWCG_GENERAL_CAUSE"]
df = df.loc[:, transfer_cols]

print('Rows before: ' + str(df.shape[0]))

# Identify the rows which have duplicates
duplicated = df.duplicated(keep=False)

# Coalesce duplicate rows into a count column
df = df.loc[duplicated].groupby(transfer_cols).size().reset_index(name="COUNT")

print('Rows after: ' + str(df.shape[0]))

print(df.columns)

# Save data into database
conn = sqlite3.connect(sys.argv[2])

df.to_sql("Fires", con=conn, if_exists="replace")
