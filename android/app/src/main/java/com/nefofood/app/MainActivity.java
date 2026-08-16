package com.nefofood.app;

import android.os.Bundle;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "NeFoAppUpdate";

    private AppUpdateManager appUpdateManager;

    private final ActivityResultLauncher<IntentSenderRequest> updateActivityResultLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.StartIntentSenderForResult(),
                    this::handleUpdateResult
            );

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        appUpdateManager = AppUpdateManagerFactory.create(this);

        // Check Google Play every time NeFo is freshly launched.
        checkForImmediateUpdate();
    }

    @Override
    public void onResume() {
        super.onResume();

        if (appUpdateManager == null) {
            return;
        }

        // If an immediate update was already started and the app returns to
        // the foreground, resume Google's update flow.
        appUpdateManager
                .getAppUpdateInfo()
                .addOnSuccessListener(appUpdateInfo -> {
                    if (appUpdateInfo.updateAvailability()
                            == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                        startImmediateUpdate(appUpdateInfo);
                    }
                })
                .addOnFailureListener(error ->
                        Log.w(TAG, "Could not resume in-app update flow.", error)
                );
    }

    private void checkForImmediateUpdate() {
        appUpdateManager
                .getAppUpdateInfo()
                .addOnSuccessListener(appUpdateInfo -> {
                    if (appUpdateInfo.updateAvailability()
                            == UpdateAvailability.UPDATE_AVAILABLE
                            && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        startImmediateUpdate(appUpdateInfo);
                    }
                })
                .addOnFailureListener(error ->
                        Log.w(TAG, "Could not check Google Play for an update.", error)
                );
    }

    private void startImmediateUpdate(AppUpdateInfo appUpdateInfo) {
        try {
            appUpdateManager.startUpdateFlowForResult(
                    appUpdateInfo,
                    updateActivityResultLauncher,
                    AppUpdateOptions
                            .newBuilder(AppUpdateType.IMMEDIATE)
                            .build()
            );
        } catch (Exception error) {
            Log.e(TAG, "Could not start Google Play in-app update.", error);
        }
    }

    private void handleUpdateResult(ActivityResult result) {
        if (result.getResultCode() == RESULT_OK) {
            Log.d(TAG, "Google Play in-app update accepted.");
            return;
        }

        // If the user cancels or the update fails, NeFo stays usable.
        // The app checks again on the next fresh launch.
        Log.w(
                TAG,
                "Google Play in-app update was cancelled or failed. Result code: "
                        + result.getResultCode()
        );
    }
}
